import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify caller has a valid session
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get caller's role from franchise schema
    const { data: callerProfile } = await supabaseAdmin
      .schema('franchise')
      .from('profiles')
      .select('role, franchise_id')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || !['super_admin', 'franchise_owner'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Owners can only delete staff from their own franchise
    if (callerProfile.role === 'franchise_owner') {
      const { data: targetProfile } = await supabaseAdmin
        .schema('franchise')
        .from('profiles')
        .select('role, franchise_id')
        .eq('id', user_id)
        .single()

      if (targetProfile?.role !== 'staff' || targetProfile?.franchise_id !== callerProfile.franchise_id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Release FK constraints before deleting auth user (franchise schema, per DB inspection)
    const { error: vrErr } = await supabaseAdmin.schema('franchise').from('vr_registrations').delete().eq('staff_id', user_id)
    if (vrErr) return new Response(JSON.stringify({ error: 'vr_registrations: ' + vrErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { error: frErr } = await supabaseAdmin.schema('franchise').from('franchises').update({ owner_id: null }).eq('owner_id', user_id)
    if (frErr) return new Response(JSON.stringify({ error: 'franchises: ' + frErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Null out / delete all FK references to profiles before deleting profile
    const cleanups: [string, Promise<{ error: unknown }>][] = [
      ['sales', supabaseAdmin.schema('franchise').from('sales').update({ staff_id: null }).eq('staff_id', user_id)],
      ['attendance', supabaseAdmin.schema('franchise').from('attendance').delete().eq('user_id', user_id)],
      ['franchise_locations', supabaseAdmin.schema('franchise').from('franchise_locations').update({ requested_by: null }).eq('requested_by', user_id)],
      ['invites', supabaseAdmin.schema('franchise').from('invites').update({ invited_by: null }).eq('invited_by', user_id)],
      ['restock_requests', supabaseAdmin.schema('franchise').from('restock_requests').update({ requested_by: null }).eq('requested_by', user_id)],
      ['notifications', supabaseAdmin.schema('franchise').from('notifications').delete().eq('user_id', user_id)],
      ['customer_notes', supabaseAdmin.from('customer_notes').update({ created_by: null }).eq('created_by', user_id)],
      ['orders', supabaseAdmin.from('orders').update({ converted_by: null }).eq('converted_by', user_id)],
      ['payments', supabaseAdmin.from('payments').update({ created_by: null }).eq('created_by', user_id)],
    ]
    for (const [label, op] of cleanups) {
      const { error: e } = await op
      if (e) return new Response(JSON.stringify({ error: label + ': ' + e.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { error: prErr } = await supabaseAdmin.schema('franchise').from('profiles').delete().eq('id', user_id)
    if (prErr) return new Response(JSON.stringify({ error: 'profiles: ' + prErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (error) {
      return new Response(JSON.stringify({ error: 'auth: ' + error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
