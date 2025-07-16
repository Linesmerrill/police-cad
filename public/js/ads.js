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

// Function to check if user has premium_plus subscription
function hasPremiumPlus() {
  return typeof dbUser !== "undefined" && 
         dbUser?.user?.subscription?.active && 
         dbUser.user.subscription.plan === "premium_plus";
}

// Function to check if user has premium subscription
function hasPremium() {
  return typeof dbUser !== "undefined" && 
         dbUser?.user?.subscription?.active && 
         dbUser.user.subscription.plan === "premium";
}

// Function to check if ads should be shown based on subscription
function shouldShowAds() {
  if (hasPremiumPlus()) {
    return false; // No ads for premium_plus
  } else if (hasPremium()) {
    // 50% chance for premium users
    return Math.random() < 0.5;
  } else {
    return true; // Show ads for free users
  }
}

// Function to hide all ad containers
function hideAllAds() {
  const adContainers = document.querySelectorAll('.heroui-ad-container');
  adContainers.forEach(container => {
    container.style.display = 'none';
  });
}

// Function to show ads with premium logic
function showAdsWithPremiumLogic() {
  if (hasPremiumPlus()) {
    // Hide all ads for premium_plus users
    hideAllAds();
  } else if (hasPremium()) {
    // Show 50% of ads for premium users
    const adContainers = document.querySelectorAll('.heroui-ad-container');
    adContainers.forEach((container, index) => {
      if (Math.random() < 0.5) {
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    });
  } else {
    // Show all ads for free users
    const adContainers = document.querySelectorAll('.heroui-ad-container');
    adContainers.forEach(container => {
      container.style.display = 'block';
    });
  }
}

// Initialize ad visibility when DOM is ready
$(document).ready(function() {
  showAdsWithPremiumLogic();
});
