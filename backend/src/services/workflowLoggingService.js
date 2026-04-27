/**
 * Workflow Test Results Logging Service
 * Stores test results in PostgreSQL for traceability and debugging
 */

const pool = require("../db");

/**
 * Create workflow_test_results table if it doesn't exist
 */
async function ensureTestResultsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS workflow_test_results (
      id SERIAL PRIMARY KEY,
      workflow_name VARCHAR(255) NOT NULL,
      test_type VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL,
      request_payload JSONB,
      response_payload JSONB,
      error_message TEXT,
      execution_time_ms INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexQueries = [
    `CREATE INDEX IF NOT EXISTS idx_workflow_test_name ON workflow_test_results(workflow_name);`,
    `CREATE INDEX IF NOT EXISTS idx_workflow_test_created ON workflow_test_results(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_workflow_test_status ON workflow_test_results(status);`,
  ];

  try {
    await pool.query(createTableQuery);
    console.log("✓ workflow_test_results table ready");

    for (const indexQuery of createIndexQueries) {
      await pool.query(indexQuery);
    }
    console.log("✓ workflow_test_results indexes created");
  } catch (error) {
    console.error("Error creating test results table:", error.message);
  }
}

/**
 * Log a workflow test result
 * @param {Object} testResult - { workflowName, testType, status, requestPayload, responsePayload, errorMessage, executionTimeMs }
 * @returns {Object} Inserted record with id
 */
async function logTestResult(testResult) {
  const {
    workflowName,
    testType,
    status,
    requestPayload,
    responsePayload,
    errorMessage,
    executionTimeMs,
  } = testResult;

  const query = `
    INSERT INTO workflow_test_results
    (workflow_name, test_type, status, request_payload, response_payload, error_message, execution_time_ms)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, created_at;
  `;

  try {
    const result = await pool.query(query, [
      workflowName,
      testType,
      status,
      JSON.stringify(requestPayload),
      JSON.stringify(responsePayload),
      errorMessage || null,
      executionTimeMs || null,
    ]);

    return result.rows[0];
  } catch (error) {
    console.error("Error logging test result:", error.message);
    throw error;
  }
}

/**
 * Get test results for a workflow
 * @param {string} workflowName - Name of workflow
 * @param {number} limit - Number of results (default: 10)
 * @returns {Array} Test results
 */
async function getTestResults(workflowName, limit = 10) {
  const query = `
    SELECT * FROM workflow_test_results
    WHERE workflow_name = $1
    ORDER BY created_at DESC
    LIMIT $2;
  `;

  try {
    const result = await pool.query(query, [workflowName, limit]);
    return result.rows;
  } catch (error) {
    console.error("Error fetching test results:", error.message);
    throw error;
  }
}

/**
 * Get test statistics
 * @param {string} workflowName - Name of workflow (optional)
 * @returns {Object} Statistics
 */
async function getTestStatistics(workflowName) {
  const query = workflowName
    ? `
      SELECT
        workflow_name,
        status,
        COUNT(*) as count,
        AVG(execution_time_ms) as avg_execution_ms,
        MAX(execution_time_ms) as max_execution_ms,
        MIN(execution_time_ms) as min_execution_ms
      FROM workflow_test_results
      WHERE workflow_name = $1
      GROUP BY workflow_name, status;
    `
    : `
      SELECT
        workflow_name,
        status,
        COUNT(*) as count,
        AVG(execution_time_ms) as avg_execution_ms,
        MAX(execution_time_ms) as max_execution_ms,
        MIN(execution_time_ms) as min_execution_ms
      FROM workflow_test_results
      GROUP BY workflow_name, status;
    `;

  try {
    const result = await pool.query(query, workflowName ? [workflowName] : []);
    return result.rows;
  } catch (error) {
    console.error("Error getting test statistics:", error.message);
    throw error;
  }
}

/**
 * Clear old test results (older than N days)
 * @param {number} daysOld - Delete records older than this many days (default: 30)
 * @returns {number} Number of rows deleted
 */
async function clearOldResults(daysOld = 30) {
  const query = `
    DELETE FROM workflow_test_results
    WHERE created_at < NOW() - INTERVAL '${daysOld} days';
  `;

  try {
    const result = await pool.query(query);
    return result.rowCount;
  } catch (error) {
    console.error("Error clearing old results:", error.message);
    throw error;
  }
}

// Initialize on module load
ensureTestResultsTable();

module.exports = {
  ensureTestResultsTable,
  logTestResult,
  getTestResults,
  getTestStatistics,
  clearOldResults,
};
