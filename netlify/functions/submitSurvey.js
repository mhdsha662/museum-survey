const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for server-side operations

const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const submission = JSON.parse(event.body);
    
    // Ensure timestamp is included
    if (!submission.timestamp) {
      submission.timestamp = new Date().toISOString();
    }

    console.log('Received submission:', submission);

    // Insert into Supabase
    const { data, error } = await supabase
      .from('survey_submissions')
      .insert([{
        feedback_id: submission.feedback_id,
        timestamp: submission.timestamp,
        language: submission.language,
        score: submission.score || 0,
        q1: submission.q1 || null,
        q2: submission.q2 || null,
        q3: submission.q3 || null,
        q4: submission.q4 || null,
        q5: submission.q5 || null,
        q6: submission.q6 || null,
        q7: Array.isArray(submission.q7) ? submission.q7.join('; ') : submission.q7 || null,
        q8: submission.q8 || null,
        q9: submission.q9 || null,
        q10: submission.q10 || null,
        q11: submission.q11 || null,
        q2_followup: submission.q2_followup || null,
        q4_followup: submission.q4_followup || null,
        q5_followup: submission.q5_followup || null,
        q7_followup: submission.q7_followup || null,
        q10_followup: submission.q10_followup || null,
        user_agent: submission.user_agent || null,
        page_url: submission.page_url || null,
        tz_offset_min: submission.tz_offset_min || null
      }])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Successfully inserted:', data);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true, 
        id: data[0]?.id,
        message: 'Survey submitted successfully' 
      })
    };

  } catch (error) {
    console.error('Error submitting survey:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to submit survey',
        details: error.message 
      })
    };
  }
};