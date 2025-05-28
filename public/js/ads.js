$(document).ready(function () {
  // Ensure dbUser is defined
  if (typeof dbUser !== "undefined" && dbUser?.user?.subscription?.active) {
    const plan = dbUser.user.subscription.plan;
    if (plan === "premium_plus") {
      // Skip AdSense initialization for Premium Plus
      return;
    } else if (plan === "premium") {
      // Initialize AdSense with reduced ad frequency for Premium
      (adsbygoogle = window.adsbygoogle || []).push({
        google_ad_client: "ca-pub-3842696805773142",
        enable_page_level_ads: true,
        settings: {
          ad_frequency_hint: "low", // Approximate 50% ad display
        },
      });
    }
  } else {
    // Full AdSense initialization for non-subscribers or inactive subscriptions
    (adsbygoogle = window.adsbygoogle || []).push({
      google_ad_client: "ca-pub-3842696805773142",
      enable_page_level_ads: true,
    });
  }
});
