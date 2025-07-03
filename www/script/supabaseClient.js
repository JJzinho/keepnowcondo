// www/script/supabaseClient.js

// CORREÇÃO: Usando a importação de módulo (ESM) da CDN do Supabase.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// As credenciais foram extraídas da sua URL de erro. Por favor, confirme que estão corretas.
// A chave 'anon' é pública e segura para ser usada no lado do cliente.
const supabaseUrl = 'https://cshnufsmcyruyesnvoqx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaG51ZnNtY3lydXllc252b3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NzQ4NDEsImV4cCI6MjA2NTE1MDg0MX0.ZiafyB294G6ajQE0iN2Jevm4SrQuPc_MPhux5XWc650';

// Exporta o cliente Supabase inicializado para que outros módulos possam usá-lo.
export const supabase = createClient(supabaseUrl, supabaseKey);
