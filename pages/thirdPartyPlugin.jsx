import { GoogleAnalytics } from "@next/third-parties/google";

function ThirdPartyPlugin() {
  return (
    <div className="container">
      {/* Google Tag Manager */}
      <GoogleAnalytics gaId="G-NDMKGRENDB" />
      {/* End Google Tag Manager */}

      {/* Google Tag Manager (noscript) */}
      <div
        dangerouslySetInnerHTML={{
          __html: `
            <noscript>
              <iframe
                src="https://www.googletagmanager.com/ns.html?id=GTM-5X4RZWBX"
                height="0"
                width="0"
                style="display:none;visibility:hidden"
              ></iframe>
            </noscript>
          `,
        }}
      />
      {/* End Google Tag Manager (noscript) */}
    </div>
  );
}

export default ThirdPartyPlugin;
