import { Link } from 'react-router-dom';
import { Mail, Phone, PackageSearch } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import { BRAND } from '../../config/brand';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';

// Policy pages that describe returns or exchanges show how to raise a request.
export const RETURN_EXCHANGE_POLICY_SLUGS = new Set([
  'return-policy',
  'exchange-policy',
  'refund-policy',
  'returns-and-exchanges',
]);

// Deliberately generic: no order or customer details travel in this URL. The personalised,
// order-specific message is built server-side from "My Orders" for signed-in customers.
const GENERAL_ENQUIRY = 'Hello! I have a question about a return or exchange.';

/**
 * How returns and exchanges work now: the request is made on WhatsApp, either pre-filled from
 * the order (recommended) or as a general chat. Phone and email remain as fallbacks for
 * customers who cannot use WhatsApp.
 */
export function ReturnExchangeHelpCard() {
  const { whatsappNumber, supportPhone, supportEmail } = useConfig();
  const whatsappUrl = BRAND.getWhatsAppUrl(GENERAL_ENQUIRY, whatsappNumber);
  const hasWhatsApp = Boolean(whatsappUrl) && whatsappUrl !== '#';

  return (
    <section
      aria-labelledby="return-exchange-help-heading"
      className="mt-12 rounded-[var(--radius-lg)] border border-outline-variant/40 bg-surface-bright p-6 sm:p-8"
    >
      <h2
        id="return-exchange-help-heading"
        className="font-serif-heading text-[19px] sm:text-[21px] font-medium text-on-surface"
      >
        Requesting a return or exchange
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-on-surface/75">
        Requests are handled personally by our team on WhatsApp.
      </p>

      <ol className="mt-6 space-y-4 text-[13px] text-on-surface/85">
        {[
          'Open My Orders and choose the item you would like to return or exchange.',
          'Tell us what went wrong. We prepare a WhatsApp message with your order details.',
          'Press Send in WhatsApp. Our team replies there with the next steps.',
        ].map((step, index) => (
          <li key={step} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary"
            >
              {index + 1}
            </span>
            <span className="pt-0.5 leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/dashboard/orders"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-on-surface px-6 text-[11px] font-bold uppercase tracking-widest text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <PackageSearch className="h-4 w-4" aria-hidden="true" />
          Go to My Orders
        </Link>
        {hasWhatsApp && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#25D366] px-6 text-[11px] font-bold uppercase tracking-widest text-[#128C4B] transition-colors hover:bg-[#25D366]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C4B]"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Chat on WhatsApp
          </a>
        )}
      </div>

      {(supportPhone || supportEmail) && (
        <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-on-surface/70">
          <span>Can&apos;t use WhatsApp?</span>
          {supportPhone && (
            <a
              href={`tel:${String(supportPhone).replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1.5 underline underline-offset-2 hover:text-on-surface"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {supportPhone}
            </a>
          )}
          {supportEmail && (
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center gap-1.5 underline underline-offset-2 hover:text-on-surface"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {supportEmail}
            </a>
          )}
        </p>
      )}
    </section>
  );
}
