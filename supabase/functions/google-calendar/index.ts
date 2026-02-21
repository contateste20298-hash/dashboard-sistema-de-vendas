
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from './cors.ts'

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const url = new URL(req.url)
        const action = url.searchParams.get('action')

        const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
        const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')

        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
            console.error('Missing Google API credentials')
            throw new Error('Configuração incompleta: GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET ausente.')
        }

        const REDIRECT_URI = `https://oriqgofzpgzxahkowdou.supabase.co/functions/v1/google-calendar?action=exchange-token`

        // --- HELPER: Token Management ---
        const getValidToken = async (userId: string) => {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error || !profile) throw new Error('Profile not found')

            const now = Date.now()
            // If token is still valid (with 5 min buffer), return it
            if (profile.access_token && profile.token_expiry && (profile.token_expiry * 1000) > (now + 300000)) {
                return profile.access_token
            }

            if (!profile.google_refresh_token) throw new Error('No refresh token available. User must reconnect.')

            // Refresh token
            const res = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    refresh_token: profile.google_refresh_token,
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    grant_type: 'refresh_token',
                }),
            })

            const data = await res.json()
            if (data.error) throw new Error(`Refresh Error: ${data.error_description || data.error}`)

            const newExpiry = Math.floor(Date.now() / 1000) + data.expires_in

            await supabase.from('profiles').update({
                access_token: data.access_token,
                token_expiry: newExpiry
            }).eq('id', userId)

            return data.access_token
        }

        // --- ACTIONS ---

        if (action === 'auth-url') {
            // Support both body and query param for user_id
            let userId = url.searchParams.get('user_id')

            if (!userId) {
                try {
                    const body = await req.json()
                    userId = body?.user_id
                } catch (e) {
                    console.warn('Could not parse request body for auth-url:', e.message)
                }
            }

            if (!userId) throw new Error('userId is required (body or query param)')

            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
            authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
            authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
            authUrl.searchParams.set('response_type', 'code')
            authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events')
            authUrl.searchParams.set('access_type', 'offline')
            authUrl.searchParams.set('prompt', 'consent')
            authUrl.searchParams.set('state', userId) // Pass user_id back to callback

            return new Response(JSON.stringify({ url: authUrl.toString() }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (action === 'exchange-token') {
            const code = url.searchParams.get('code')
            const userId = url.searchParams.get('state') // retrieved from state
            if (!code || !userId) throw new Error('Invalid code or state')

            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: GOOGLE_CLIENT_ID!,
                    client_secret: GOOGLE_CLIENT_SECRET!,
                    redirect_uri: REDIRECT_URI,
                    grant_type: 'authorization_code',
                }),
            })

            const tokens = await tokenRes.json()
            if (tokens.error) throw new Error(`Google Error: ${tokens.error_description || tokens.error}`)

            const expiry = Math.floor(Date.now() / 1000) + tokens.expires_in

            const { error: updateError } = await supabase.from('profiles').update({
                access_token: tokens.access_token,
                google_refresh_token: tokens.refresh_token, // Only sent on first consent
                token_expiry: expiry
            }).eq('id', userId)

            if (updateError) throw updateError

            return new Response(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Conexão Bem-Sucedida</title>
          </head>
          <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background: #0f172a; color: white; margin: 0;">
            <div style="background: #1e293b; display: inline-block; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-width: 90%; margin: 20px;">
              <h1 style="color: #38bdf8;">Conexão Bem-Sucedida!</h1>
              <p style="font-size: 1.1em;">O Google Calendar foi integrado com sucesso à sua conta.</p>
              <p style="color: #94a3b8;">Esta aba será fechada automaticamente em alguns segundos...</p>
              <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; border-radius: 8px; border: none; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer;">Fechar Agora</button>
            </div>
            <script>
              // Notify the opener
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_CONNECTED', success: true }, '*');
              }
              
              // Close after 3 seconds
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `, {
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                },
            })
        }

        if (action === 'list-calendars') {
            const authHeader = req.headers.get('Authorization')
            const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') ?? '')
            if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

            const token = await getValidToken(user.id)
            const calRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await calRes.json()
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'list-slots') {
            const { target_user_id, timeMin, timeMax } = await req.json()
            const token = await getValidToken(target_user_id)

            // Get the profile to know which calendar to check
            const { data: profile } = await supabase.from('profiles').select('email, selected_calendar_id').eq('id', target_user_id).single()
            const calendarId = profile?.selected_calendar_id || 'primary'

            const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timeMin,
                    timeMax,
                    items: [{ id: calendarId }]
                })
            })
            const data = await fbRes.json()
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'create-event') {
            const { target_user_id, event } = await req.json()
            const token = await getValidToken(target_user_id)

            const { data: profile } = await supabase.from('profiles').select('selected_calendar_id').eq('id', target_user_id).single()
            const calendarId = profile?.selected_calendar_id || 'primary'

            const eventRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            })
            const data = await eventRes.json()
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'update-event') {
            const { target_user_id, event_id, event } = await req.json()
            const token = await getValidToken(target_user_id)

            const { data: profile } = await supabase.from('profiles').select('selected_calendar_id').eq('id', target_user_id).single()
            const calendarId = profile?.selected_calendar_id || 'primary'

            const eventRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event_id}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            })
            const data = await eventRes.json()
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'delete-event') {
            const { target_user_id, event_id } = await req.json()
            const token = await getValidToken(target_user_id)

            const { data: profile } = await supabase.from('profiles').select('selected_calendar_id').eq('id', target_user_id).single()
            const calendarId = profile?.selected_calendar_id || 'primary'

            const eventRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })

            if (!eventRes.ok) {
                const errData = await eventRes.json()
                return new Response(JSON.stringify(errData), { status: eventRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            return new Response(null, { status: 204, headers: corsHeaders })
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('[Unified Function Error]:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
