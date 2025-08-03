
  (function() {
  // 1. Load the Google Analytics script asynchronously
  var gtagScript = document.createElement('script');
  gtagScript.async = true;
  gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=G-WZNWGDT4TX";
  document.head.appendChild(gtagScript);

  // 2. Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag; // Make gtag globally available

  // 3. Configure GA
  gtag('js', new Date());
  gtag('config', 'G-WZNWGDT4TX');
})();
