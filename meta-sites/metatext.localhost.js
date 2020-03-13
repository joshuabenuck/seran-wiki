const { stat } = Deno;
export let metaPages = {};

export async function init(opts) {
    opts.site.pages(`
Welcome Visitors

  Welcome to this [[DenoWiki]] Federated Wiki site.
  From this page you can find who we are and what we do.
  New sites provide this information and then claim the site as their own.
  You will need your own site to participate.

  Pages about us.

  [[Ward Cunningham]]

  Pages where we do and share.

  [[Region Scraper]]


Region Scraper

  Here we supervise the ongoing scrape of the wiki federation.
  We invision this as cooperating loops where sitemap fetches lead
  to page fetches and these lead to more sitemap fetches.

  See [[Stepping the Async Scrape]]

  While developing this technology we focus first on a nested loop.
  We have several versions of this where we explore different instrumentation strategies.

  [[Mock Computation]]

  [[Triple Controls]]

Mock Computation

  Here we start, stop and step a triple nested loop that counts iterations
  until five of each, for 5 * 5 * 5 total iterations have completed.
  See also [[Triple Controls]] of the same loop

  process-step:
    legend: "Simple Nested Loop",
    href: "/simple"

Triple Controls

  Here we start, stop and step with distinct controls for each nesting level.

  process-step:
    legend: "Outer Nested Loop",
    href: "/outer"

  process-step:
    legend: "Middle Nested Loop",
    href: "/middle"

  process-step:
    legend: "Inner Nested Loop",
    href: "/inner"`

)}

