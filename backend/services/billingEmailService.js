import { sendEmailReport } from "./emailService.js";

const clientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";

function wrap(title, body) {
  return `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#090a0f;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="padding:40px 20px;">
    <div style="max-width:600px;margin:0 auto;background:#111319;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;">
      <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:22px;font-weight:800;color:#fff;">Social <span style="color:#6366f1;">IQ</span></div>
      </div>
      <div style="font-size:14px;line-height:1.6;color:#94a3b8;">
        ${body}
      </div>
      <div style="margin-top:32px;text-align:center;font-size:11px;color:#64748b;">
        Questions? Contact <a href="mailto:support@socialiq.ai" style="color:#6366f1;">support@socialiq.ai</a>
      </div>
    </div>
  </div>
</body></html>`;
}

function money(n, currency = "INR") {
  return `${currency} ${Number(n || 0).toLocaleString("en-IN")}`;
}

export async function sendPaymentConfirmationEmail({ user, invoice, subscription }) {
  const subject = `Payment confirmed — ${invoice.invoiceNumber}`;
  const html = wrap(
    subject,
    `
    <h1 style="color:#fff;font-size:20px;margin:0 0 16px;">Payment Successful</h1>
    <p>Hi ${user?.name || "there"},</p>
    <p>Your payment for the <strong style="color:#fff;">${subscription.plan}</strong> plan (${subscription.billingCycle}) was successful.</p>
    <ul style="padding-left:18px;">
      <li>Invoice: <strong style="color:#fff;">${invoice.invoiceNumber}</strong></li>
      <li>Amount paid: <strong style="color:#fff;">${money(invoice.total || invoice.amount, invoice.currency)}</strong></li>
      <li>GST: ${money(invoice.gst, invoice.currency)}</li>
      <li>Renewal: ${subscription.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString("en-IN") : "—"}</li>
      <li>Razorpay Payment ID: ${invoice.razorpayPaymentId || "—"}</li>
    </ul>
    <div style="text-align:center;margin:28px 0;">
      <a href="${clientUrl()}/billing/invoices/${invoice._id}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">View Invoice</a>
    </div>
    `
  );
  return sendEmailReport(user.email, subject, html);
}

export async function sendSubscriptionActivatedEmail({ user, subscription }) {
  const subject = `Your ${subscription.plan} subscription is active`;
  const html = wrap(
    subject,
    `
    <h1 style="color:#fff;font-size:20px;margin:0 0 16px;">Subscription Activated</h1>
    <p>Hi ${user?.name || "there"},</p>
    <p>Welcome aboard. Your <strong style="color:#fff;">${String(subscription.plan).toUpperCase()}</strong> workspace is now live.</p>
    <p>Billing cycle: <strong style="color:#fff;">${subscription.billingCycle || "monthly"}</strong><br/>
    Next renewal: <strong style="color:#fff;">${subscription.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString("en-IN") : "—"}</strong></p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${clientUrl()}/dashboard" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Go to Dashboard</a>
    </div>
    `
  );
  return sendEmailReport(user.email, subject, html);
}

export async function sendFailedPaymentEmail({ user, reason, plan }) {
  const subject = "Payment failed — Social IQ";
  const html = wrap(
    subject,
    `
    <h1 style="color:#fff;font-size:20px;margin:0 0 16px;">Payment Failed</h1>
    <p>Hi ${user?.name || "there"},</p>
    <p>We couldn't complete your payment${plan ? ` for the <strong style="color:#fff;">${plan}</strong> plan` : ""}.</p>
    <p>Reason: <strong style="color:#f87171;">${reason || "Payment was declined or cancelled"}</strong></p>
    <p>Your current subscription was not changed. You can retry anytime from Billing.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${clientUrl()}/billing" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Return to Billing</a>
    </div>
    `
  );
  return sendEmailReport(user.email, subject, html);
}

export async function sendCancellationConfirmationEmail({ user, subscription }) {
  const subject = "Subscription cancellation confirmed";
  const html = wrap(
    subject,
    `
    <h1 style="color:#fff;font-size:20px;margin:0 0 16px;">Cancellation Confirmed</h1>
    <p>Hi ${user?.name || "there"},</p>
    <p>Auto-renewal has been turned off for your <strong style="color:#fff;">${subscription.plan}</strong> plan.</p>
    <p>You'll retain access until <strong style="color:#fff;">${subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN") : "the end of your billing period"}</strong>.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${clientUrl()}/billing" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Manage Billing</a>
    </div>
    `
  );
  return sendEmailReport(user.email, subject, html);
}

export async function sendRenewalReminderEmail({ user, subscription }) {
  const subject = "Upcoming renewal — Social IQ";
  const html = wrap(
    subject,
    `
    <h1 style="color:#fff;font-size:20px;margin:0 0 16px;">Renewal Reminder</h1>
    <p>Hi ${user?.name || "there"},</p>
    <p>Your <strong style="color:#fff;">${subscription.plan}</strong> subscription renews on <strong style="color:#fff;">${subscription.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString("en-IN") : "soon"}</strong>.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${clientUrl()}/billing" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Review Billing</a>
    </div>
    `
  );
  return sendEmailReport(user.email, subject, html);
}

export default {
  sendPaymentConfirmationEmail,
  sendSubscriptionActivatedEmail,
  sendFailedPaymentEmail,
  sendCancellationConfirmationEmail,
  sendRenewalReminderEmail,
};
