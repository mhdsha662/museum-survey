const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your_secret_password';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Simple password authentication
  const password = event.queryStringParameters?.password;
  if (password !== ADMIN_PASSWORD) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Please provide the correct password'
      })
    };
  }

  try {
    // Get total count
    const { count: totalCount, error: totalError } = await supabase
      .from('survey_submissions')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Get English responses count
    const { count: englishCount, error: englishError } = await supabase
      .from('survey_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'en');

    if (englishError) throw englishError;

    // Get Arabic responses count
    const { count: arabicCount, error: arabicError } = await supabase
      .from('survey_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'ar');

    if (arabicError) throw arabicError;

    // Get recent submissions (last 10)
    const { data: recentSubmissions, error: recentError } = await supabase
      .from('survey_submissions')
      .select('id, timestamp, language, score, q3, q9, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        stats: {
          total: totalCount || 0,
          english: englishCount || 0,
          arabic: arabicCount || 0
        },
        recentSubmissions: recentSubmissions || []
      })
    };

  } catch (error) {
    console.error('Error getting stats:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to get statistics',
        details: error.message 
      })
    };
  }
};