const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your_secret_password';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to convert array of objects to CSV
function jsonToCSV(data) {
  if (!data || data.length === 0) {
    return 'No data found';
  }

  // Define the column order and headers
  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'feedback_id', header: 'Feedback ID' },
    { key: 'timestamp', header: 'Submission Time' },
    { key: 'language', header: 'Language' },
    { key: 'score', header: 'Score' },
    { key: 'q1', header: 'Q1: Museum Visits' },
    { key: 'q2', header: 'Q2: Other QM Locations' },
    { key: 'q2_followup', header: 'Q2 Follow-up: Which locations' },
    { key: 'q3', header: 'Q3: Visit Reason' },
    { key: 'q4', header: 'Q4: Residency Status' },
    { key: 'q4_followup', header: 'Q4 Follow-up: Country' },
    { key: 'q5', header: 'Q5: Came With' },
    { key: 'q5_followup', header: 'Q5 Follow-up: Specify Other' },
    { key: 'q6', header: 'Q6: Group Size' },
    { key: 'q7', header: 'Q7: Places/Services Used' },
    { key: 'q7_followup', header: 'Q7 Follow-up: Other Services' },
    { key: 'q8', header: 'Q8: Visit Duration' },
    { key: 'q9', header: 'Q9: Rating (1-10)' },
    { key: 'q10', header: 'Q10: Future Surveys' },
    { key: 'q10_followup', header: 'Q10 Follow-up: Contact Info' },
    { key: 'q11', header: 'Q11: Additional Comments' },
    { key: 'user_agent', header: 'Browser Info' },
    { key: 'page_url', header: 'Page URL' },
    { key: 'tz_offset_min', header: 'Timezone Offset' },
    { key: 'created_at', header: 'Created At' }
  ];

  // Create header row
  const headerRow = columns.map(col => col.header).join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return columns.map(col => {
      let value = row[col.key];
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Convert to string
      value = String(value);
      
      // Format timestamps to be more readable
      if (col.key === 'timestamp' || col.key === 'created_at') {
        if (value) {
          try {
            const date = new Date(value);
            value = date.toLocaleString('en-GB', { 
              timeZone: 'Asia/Qatar',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
          } catch (e) {
            // Keep original value if date parsing fails
          }
        }
      }
      
      // Escape CSV special characters
      if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      
      return value;
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}

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
        message: 'Please provide the correct password as a query parameter: ?password=your_password'
      })
    };
  }

  try {
    // Get filter parameters
    const startDate = event.queryStringParameters?.start_date;
    const endDate = event.queryStringParameters?.end_date;
    const language = event.queryStringParameters?.language;

    // Build query
    let query = supabase
      .from('survey_submissions')
      .select('*')
      .order('timestamp', { ascending: false });

    // Apply filters if provided
    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    if (endDate) {
      query = query.lte('timestamp', endDate);
    }
    if (language) {
      query = query.eq('language', language);
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="qatar_museums_survey_no_data.csv"'
        },
        body: 'No survey submissions found'
      };
    }

    // Convert to CSV
    const csvContent = jsonToCSV(data);
    
    // Generate filename with current date and filters
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    let filename = `qatar_museums_survey_${dateStr}`;
    
    if (language) filename += `_${language}`;
    if (startDate || endDate) filename += '_filtered';
    filename += '.csv';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*'
      },
      body: csvContent
    };

  } catch (error) {
    console.error('Error exporting CSV:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to export CSV',
        details: error.message 
      })
    };
  }
};