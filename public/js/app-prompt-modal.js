document.addEventListener("DOMContentLoaded", function () {
  // Detect if the user is on a mobile device
  const isMobile = /iPhone|iPad|iPod|Android|BlackBerry|Windows Phone/i.test(
    navigator.userAgent
  );
  if (!isMobile) {
    return; // Don't show the modal if the user is not on a mobile device
  }

  // Check if the user has already dismissed the banner permanently
  const hasDismissed = localStorage.getItem("appPromptDismissed");
  if (hasDismissed === "true") {
    return; // Don't show the banner if user has dismissed it
  }

  // Create the modal container
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.bottom = "0";
  modal.style.left = "0";
  modal.style.right = "0";
  modal.style.backgroundColor = "#f9fafb";
  modal.style.padding = "1rem";
  modal.style.boxShadow = "0 -2px 10px rgba(0, 0, 0, 0.1)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "space-between";
  modal.style.zIndex = "1000";
  modal.style.fontFamily = "'Inter', sans-serif";

  // Create the content container (for close button, icon, and text)
  const content = document.createElement("div");
  content.style.display = "flex";
  content.style.alignItems = "center";
  content.style.gap = "0.75rem";

  // Add close button (on the left)
  const closeButton = document.createElement("button");
  closeButton.style.background = "none";
  closeButton.style.border = "none";
  closeButton.style.fontSize = "1.2rem";
  closeButton.style.cursor = "pointer";
  closeButton.textContent = "×";
  closeButton.onclick = function () {
    modal.remove();
    // Set permanent dismissal flag in localStorage
    localStorage.setItem("appPromptDismissed", "true");
  };
  content.appendChild(closeButton);

  // Add app icon using the relative path
  const icon = document.createElement("img");
  icon.src = "/static/images/lpc-app-icon-96x96.png";
  icon.style.width = "48px";
  icon.style.height = "48px";
  icon.style.borderRadius = "8px";
  content.appendChild(icon);

  // Create text container for "LPC APP" and description
  const textContainer = document.createElement("div");
  textContainer.style.display = "flex";
  textContainer.style.flexDirection = "column";

  // Add bold "LPC APP" text
  const appName = document.createElement("p");
  appName.style.margin = "0";
  appName.style.color = "#1f2937";
  appName.style.fontSize = "0.9rem";
  appName.style.fontWeight = "bold";
  appName.textContent = "LPC APP";
  textContainer.appendChild(appName);

  // Add description text
  const description = document.createElement("p");
  description.style.margin = "0";
  description.style.color = "#1f2937";
  description.style.fontSize = "0.8rem";
  description.textContent = "Get our mobile app for a better experience";
  textContainer.appendChild(description);

  // Add "Don't show again" hint
  const hint = document.createElement("p");
  hint.style.margin = "0";
  hint.style.color = "#6b7280";
  hint.style.fontSize = "0.7rem";
  hint.style.fontStyle = "italic";
  hint.textContent = "Tap × to dismiss permanently";
  textContainer.appendChild(hint);

  content.appendChild(textContainer);

  // Add button (on the right)
  const button = document.createElement("button");
  button.style.backgroundColor = "#2563eb";
  button.style.color = "white";
  button.style.padding = "0.5rem 1rem";
  button.style.borderRadius = "9999px";
  button.style.border = "none";
  button.style.fontSize = "0.9rem";
  button.style.cursor = "pointer";
  button.textContent = "Open"; // Default to "Open"

  // Detect if the user is on Android or iOS
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Handle button click with deep linking and fallback
  button.onclick = function () {
    // Attempt to open the app using the provided custom URL scheme
    const appScheme = "exp+police-cad-app://";
    const appStoreUrl = isAndroid
      ? "https://play.google.com/store/apps/details?id=com.linesmerrill.policecadapp"
      : "https://apps.apple.com/app/id6503307483";

    // Create an iframe to attempt opening the app (works better on some browsers)
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = appScheme;
    document.body.appendChild(iframe);

    // Fallback to app store if the app doesn't open within 1 second
    const timeout = setTimeout(() => {
      window.location.href = appStoreUrl;
    }, 1000);

    // If the app opens, the page will lose focus, and we can cancel the timeout
    window.addEventListener("blur", () => {
      clearTimeout(timeout);
    });

    // Alternative method: Directly set window.location (uncomment if iframe method doesn't work)
    /*
        window.location.href = appScheme;
        setTimeout(() => {
            window.location.href = appStoreUrl;
        }, 1000);
        */
  };

  // Assemble the modal
  modal.appendChild(content);
  modal.appendChild(button);

  // Add the modal to the page
  document.body.appendChild(modal);
});
