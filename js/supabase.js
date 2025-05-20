// Инициализация клиента Supabase
const supabaseUrl = 'https://mwbyuueswvspgvppwukh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13Ynl1dWVzd3ZzcGd2cHB3dWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Nzc2OTMsImV4cCI6MjA2MzM1MzY5M30.enMt4OzkSeXC8psFJ0NJuecm0yY0a-yN9YjFmX6OKt0';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);
