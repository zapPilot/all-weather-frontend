import Script from "next/script";

function ThirdPartyPlugin() {
  return (
    <div className="container">
      {/* google analytics */}
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-NDMKGRENDB" />
      <Script id="google-analytics">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
 
          gtag('config', 'G-NDMKGRENDB');
        `}
      </Script>
      {/* Crisp Chat */}
      <Script type="text/javascript">
        {`
          window.$crisp=[];window.CRISP_WEBSITE_ID="3349c459-6071-4b8d-929e-10383598563b";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();
        `}
      </Script>
    </div>
  );
}

export default ThirdPartyPlugin;
