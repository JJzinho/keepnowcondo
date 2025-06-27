// script/supabaseClient.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Substitua com a URL e a chave Anon do seu projeto Supabase
const SUPABASE_URL = 'https://cshnufsmcyruyesnvoqx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaG51ZnNtY3lydXllc252b3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NzQ4NDEsImV4cCI6MjA2NTE1MDg0MX0.ZiafyB294G6ajQE0iN2Jevm4SrQuPc_MPhux5XWc650';

// Cria e exporta o cliente Supabase para ser usado em outros scripts
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);