import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server.js";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({});
};

export default function AppTermsOfService() {
  return (
    <s-page title="Terms of Service" back-action-url="/app/settings">
      <s-stack gap="500">
        <s-section>
          <s-stack gap="400">
            <s-text as="p" tone="subdued">
              Last updated: February 2026
            </s-text>

            <s-text variant="headingMd" as="h2">
              Service Description
            </s-text>
            <s-text as="p">
              Refund &amp; Return Analytics ("the App") is an analytics tool
              that displays refund and return data from your Shopify store.
              The App helps merchants understand refund trends, return
              reasons, and their impact on revenue.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Acceptance of Terms
            </s-text>
            <s-text as="p">
              By installing and using the App, you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please
              uninstall the App.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Billing
            </s-text>
            <s-text as="p">
              All billing for the App is handled through Shopify's billing
              system. Any refunds for app charges follow Shopify's refund
              policies. Please refer to Shopify's documentation for details
              on billing and payment processing.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Data Accuracy
            </s-text>
            <s-text as="p">
              The analytics provided by the App are derived from data
              available through the Shopify GraphQL Admin API. While we strive
              to present this data accurately, we do not guarantee the
              accuracy, completeness, or timeliness of Shopify's underlying
              data. The App reflects what is reported by your store's API.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Limitation of Liability
            </s-text>
            <s-text as="p">
              The App provides analytics and reporting only. It should not be
              the sole basis for business, financial, or operational
              decisions. We are not liable for any losses or damages arising
              from reliance on the data displayed by the App.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Termination
            </s-text>
            <s-text as="p">
              You may terminate your use of the App at any time by
              uninstalling it from your Shopify admin. Upon uninstallation,
              all stored data associated with your shop is automatically
              deleted.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Changes to These Terms
            </s-text>
            <s-text as="p">
              We may update these Terms of Service from time to time.
              Continued use of the App after changes are posted constitutes
              your acceptance of the revised terms.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Governing Law
            </s-text>
            <s-text as="p">
              These terms are governed by and construed in accordance with
              applicable laws. Any disputes arising from the use of the App
              will be resolved under the jurisdiction of the applicable
              courts.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Contact
            </s-text>
            <s-text as="p">
              For questions about these terms, please contact us at{" "}
              <a href="mailto:support@refundanalytics.com">
                support@refundanalytics.com
              </a>
              .
            </s-text>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}
