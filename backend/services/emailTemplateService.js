/**
 * Generates the common HTML wrap style for the SaaS emails
 */
const emailWrapper = (title, bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #090a0f;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #090a0f;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #111319;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 40px;
      box-sizing: border-box;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      text-decoration: none;
    }
    .logo span {
      color: #6366f1;
    }
    .content {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
    }
    .content h1 {
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      margin-bottom: 24px;
    }
    .btn-container {
      margin: 32px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      padding: 12px 32px;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      border-radius: 8px;
      transition: opacity 0.2s ease;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    }
    .btn:hover {
      opacity: 0.9;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 20px;
      font-size: 11px;
      color: #4b5563;
      text-align: center;
      line-height: 1.5;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="#" class="logo">Social<span>IQ</span></a>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        This is an automated security notification from Social IQ.<br>
        If you have any questions or did not authorize this action, please contact <a href="mailto:support@socialiq.ai">support@socialiq.ai</a>.
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Welcome Email Template
 */
export const getWelcomeEmail = (name) => {
  const content = `
    <h1>Welcome to Social IQ, ${name}!</h1>
    <p>We are thrilled to have you join our premium audience intelligence workspace. Your account has been verified, and your dashboards are initialized.</p>
    <p>With Social IQ, you now have access to:</p>
    <ul style="padding-left: 20px; margin-bottom: 24px; color: #94a3b8;">
      <li>Continuous automated social metrics synchronization</li>
      <li>Competitor tracking and growth spike analysis</li>
      <li>Groq AI diagnostics & automated reports</li>
    </ul>
    <div class="btn-container">
      <a href="https://socialiq.ai/dashboard" class="btn" target="_blank">Enter Workspace</a>
    </div>
    <p>Let's unlock your workspace's full potential today.</p>
  `;
  return emailWrapper("Welcome to Social IQ!", content);
};

/**
 * Forgot Password Link Template
 */
export const getForgotPasswordTemplate = (name, link) => {
  const content = `
    <h1>Reset Your Password</h1>
    <p>Hello ${name},</p>
    <p>We received a request to reset the password associated with your Social IQ account. Click the button below to set a new password:</p>
    <div class="btn-container">
      <a href="${link}" class="btn" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);" target="_blank">Reset Password</a>
    </div>
    <p>This link will expire in 1 hour. If you did not request this password reset, please secure your email and ignore this request.</p>
  `;
  return emailWrapper("Reset Your Password", content);
};

/**
 * Password Changed Confirmation Template
 */
export const getPasswordChangedTemplate = (name) => {
  const content = `
    <h1>Security Alert: Password Changed</h1>
    <p>Hello ${name},</p>
    <p>This email confirms that the password for your Social IQ account was updated successfully.</p>
    <p>As a security precaution, any active refresh token sessions on other devices have been invalidated, and they will be prompted to log in again.</p>
    <p>If you did not initiate this change, please reset your password immediately or contact our security response team.</p>
  `;
  return emailWrapper("Password Successfully Changed", content);
};

/**
 * Account Deleted Confirmation Template
 */
export const getAccountDeletedTemplate = (name) => {
  const content = `
    <h1 style="color: #ef4444;">Account Permanently Deleted</h1>
    <p>Hello ${name},</p>
    <p>We are writing to confirm that your Social IQ account and all associated dashboard integrations, competitor targets, activity logs, and settings have been permanently deleted.</p>
    <p>We are sorry to see you go! If you have any feedback or wish to rejoin us, you can create a new workspace at any time.</p>
  `;
  return emailWrapper("Account Deleted", content);
};
