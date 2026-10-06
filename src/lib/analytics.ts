/**
 * Contact-intent events.
 *
 * DESIGN CONSTRAINT: this adapter is OFF by default and ships no network code
 * at all unless a measurement ID is explicitly configured. The briefing is
 * clear that no GA4 identifier may be invented and no active tracker may be
 * installed, so the default path is a no-op.
 *
 * The events themselves describe INTENTION, not outcomes:
 *   whatsapp_click  - the visitor chose to start a conversation
 *   phone_click     - ditto, via the displayed number
 *   instagram_click - the visitor left for the public profile
 *   service_view    - a service page was read
 *
 * None of these means a customer was won, and no personal data, message
 * content or form payload is ever collected: only the route and the service
 * key, both of which are already public.
 *
 * To enable: set PUBLIC_ANALYTICS_ID and PUBLIC_ANALYTICS_PROVIDER, then
 * uncomment the loader block in Base.astro. That is a deliberate code change,
 * not a build switch, so nobody can turn tracking on by accident.
 */

export const ANALYTICS_EVENTS = [
  'whatsapp_click',
  'phone_click',
  'instagram_click',
  'service_view',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export interface AnalyticsPayload {
  /** Route the visitor was on, e.g. /instalacao-ar-condicionado-joinville/. */
  route: string;
  /** Service key when relevant, e.g. instalacao. Never free-text user input. */
  service?: string;
}

/** True only when an ID was configured at build time. */
export function analyticsEnabled(id?: string): boolean {
  return Boolean(id && id.trim().length > 0);
}

/**
 * Development-time logging sink. This is the ONLY behaviour in the default
 * build: it records intent in the console so the flow can be verified, and it
 * transmits nothing.
 */
export function trackIntent(event: AnalyticsEvent, payload: AnalyticsPayload): void {
  if (typeof window === 'undefined') return;
  const id = import.meta.env.PUBLIC_ANALYTICS_ID as string | undefined;

  if (!analyticsEnabled(id)) {
    // Local verification aid. No identifier is fabricated and nothing leaves
    // the browser.
    console.info(`[analytics:off] ${event}`, payload);
    return;
  }

  // A real provider adapter would go here, behind the configured ID. Not
  // implemented on purpose: shipping an untested tracker into a production
  // build would be worse than shipping none.
  console.info(`[analytics:${id}] ${event}`, payload);
}