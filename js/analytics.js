(function() {
    const hostname = window.location.hostname;
    let measurementId = "";
  
    if (hostname.includes("github.io")) {
      // GitHub Pages
      measurementId = "G-77VF8YQJDR"; 
    } else if (hostname.includes("griffii.com")) {
      // Your Hostinger-hosted site
      measurementId = "G-X9DNJ3WNTY"; 
    } else {
      console.warn("Unknown host, no analytics loaded.");
      return;
    }
  
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
  
    gtag('js', new Date());
    gtag('config', measurementId);
  })();
  