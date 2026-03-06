import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create admin client with service role key (safe — runs server-side only)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Verify the requesting user is an admin
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Não autorizado' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token)
        if (callerError || !caller) {
            return new Response(JSON.stringify({ error: 'Token inválido' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Check if caller is admin
        const { data: callerProfile } = await supabaseAdmin
            .from('usuarios')
            .select('role')
            .eq('id', caller.id)
            .single()

        if (callerProfile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários.' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Parse request body
        const { email, password, nome, funcao, telefone, foto_url, role } = await req.json()

        if (!email || !password || !nome) {
            return new Response(JSON.stringify({ error: 'email, password e nome são obrigatórios.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Create auth user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // skip email confirmation
        })

        if (createError) {
            return new Response(JSON.stringify({ error: createError.message }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const userId = newUser.user.id

        // Upsert profile in usuarios table
        await supabaseAdmin.from('usuarios').upsert({
            id: userId,
            email,
            nome,
            role: role || 'team',
        })

        // Insert into membros_time for team display
        const { data: membro } = await supabaseAdmin.from('membros_time').insert({
            nome,
            funcao: funcao || '',
            telefone: telefone || '',
            foto_url: foto_url || '',
        }).select().single()

        return new Response(JSON.stringify({ success: true, userId, membro }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
