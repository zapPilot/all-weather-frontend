import Script from "next/script";

function ThirdPartyPlugin() {
  return (
    <div className="container">
      {/* Google Tag Manager */}
      <Script id="google-tag-manager">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-NTTBRW42');
        `}
      </Script>
      {/* End Google Tag Manager */}

      {/* Google Tag Manager (noscript) */}
      <noscript>
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-NTTBRW42"
          height="0"
          width="0"
          style="display:none;visibility:hidden"
        ></iframe>
      </noscript>
      {/* End Google Tag Manager (noscript) */}

      {/* Crisp Chat */}
      <Script id="crisp-chat">
        {`
          window.$crisp=[];window.CRISP_WEBSITE_ID="3349c459-6071-4b8d-929e-10383598563b";
          (function(){
            d=document;s=d.createElement("script");
            s.src="https://client.crisp.chat/l.js";
            s.async=1;d.getElementsByTagName("head")[0].appendChild(s);
          })();
        `}
      </Script>
    </div>
  );
}

export default ThirdPartyPlugin;
