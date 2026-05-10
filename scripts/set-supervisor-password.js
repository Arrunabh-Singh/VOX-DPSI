import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const hash = await bcrypt.hash('Supervisor@2026', 12)
const { error } = await supabase.from('users').update({ password_hash: hash }).eq('email', 'supervisor@dpsi.com')
if (error) console.error('Failed:', error)
else console.log('Supervisor password updated')
