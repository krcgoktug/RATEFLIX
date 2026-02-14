const nodemailer = require('nodemailer');
const dns = require('dns');
const net = require('net');

let cachedTransporter = null;
let cachedTransporterKey = '';
let cachedResolvedIpv4Host = '';
let cachedResolvedIpv4HostExpiresAt = 0;

function parseBoolean(value) {
  return String(value || '').toLowerCase() === 'true';
}

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(String(value || ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
}

function shouldForceIpv4() {
  if (process.env.SMTP_FORCE_IPV4 === undefined) {
    return true;
  }
  return parseBoolean(process.env.SMTP_FORCE_IPV4);
}

async function resolveSmtpHost(host) {
  if (!host || net.isIP(host) || !shouldForceIpv4()) {
    return { host, tlsServername: undefined };
  }

  if (cachedResolvedIpv4Host && Date.now() < cachedResolvedIpv4HostExpiresAt) {
    return { host: cachedResolvedIpv4Host, tlsServername: host };
  }

  const addresses = await dns.promises.resolve4(host);
  if (!addresses || addresses.length === 0) {
    throw new Error(`Could not resolve IPv4 address for SMTP host: ${host}`);
  }

  cachedResolvedIpv4Host = addresses[0];
  cachedResolvedIpv4HostExpiresAt =
    Date.now() + parsePositiveInt(process.env.SMTP_DNS_CACHE_MS, 300000);

  return { host: cachedResolvedIpv4Host, tlsServername: host };
}

async function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = parseBoolean(process.env.SMTP_SECURE);
  const connectionTimeout = parsePositiveInt(process.env.SMTP_CONNECTION_TIMEOUT_MS, 15000);
  const greetingTimeout = parsePositiveInt(process.env.SMTP_GREETING_TIMEOUT_MS, 10000);
  const socketTimeout = parsePositiveInt(process.env.SMTP_SOCKET_TIMEOUT_MS, 20000);
  const allowInternalNetworkInterfaces = process.env.SMTP_ALLOW_INTERNAL_INTERFACES
    ? parseBoolean(process.env.SMTP_ALLOW_INTERNAL_INTERFACES)
    : true;

  const resolved = await resolveSmtpHost(process.env.SMTP_HOST);
  const cacheKey = [
    resolved.host,
    port,
    secure,
    process.env.SMTP_USER,
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    allowInternalNetworkInterfaces,
    resolved.tlsServername || ''
  ].join('|');

  if (cachedTransporter && cachedTransporterKey === cacheKey) {
    return cachedTransporter;
  }

  const transportOptions = {
    host: resolved.host,
    port,
    secure,
    // Some cloud runtimes expose only internal interfaces; allow these so IPv4 resolution works.
    allowInternalNetworkInterfaces,
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  if (resolved.tlsServername) {
    transportOptions.tls = {
      servername: resolved.tlsServername
    };
  }

  cachedTransporter = nodemailer.createTransport(transportOptions);
  cachedTransporterKey = cacheKey;

  return cachedTransporter;
}

async function sendPasswordResetEmail({ to, firstName, code, expiresMinutes }) {
  const greetingName = firstName || 'there';
  const subject = 'RATEFLIX password reset code';
  const text =
    `Hi ${greetingName},\n\n` +
    `Your RATEFLIX verification code is: ${code}\n` +
    `This code expires in ${expiresMinutes} minutes.\n\n` +
    'If you did not request this, you can safely ignore this email.';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1f2937;">
      <h2 style="margin-bottom: 12px;">RATEFLIX Password Reset</h2>
      <p style="margin: 0 0 12px;">Hi ${greetingName},</p>
      <p style="margin: 0 0 16px;">Use the verification code below to reset your password:</p>
      <div style="font-size: 30px; font-weight: 700; letter-spacing: 8px; margin: 0 0 16px;">${code}</div>
      <p style="margin: 0 0 12px;">This code expires in <strong>${expiresMinutes} minutes</strong>.</p>
      <p style="margin: 0;">If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  if (!hasSmtpConfig()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP is not configured. Set SMTP_* variables for password reset emails.');
    }
    console.warn(
      `SMTP is not configured. Password reset code for ${to}: ${code}. Set SMTP_* variables to deliver emails.`
    );
    return;
  }

  const transporter = await getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html
  });
}

module.exports = {
  sendPasswordResetEmail
};
