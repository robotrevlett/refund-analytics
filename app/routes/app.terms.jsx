import {
  Page,
  Card,
  BlockStack,
  Text,
  Link,
  Layout,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return {};
};

export default function AppTermsOfService() {
  return (
    <Page title="Terms of Service" backAction={{ url: "/app/settings" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="p" tone="subdued">
                Last updated: February 2026
              </Text>

              <Text variant="headingMd" as="h2">
                Service Description
              </Text>
              <Text as="p">
                Refund &amp; Return Analytics ("the App") is an analytics tool
                that displays refund and return data from your Shopify store.
                The App helps merchants understand refund trends, return
                reasons, and their impact on revenue.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Acceptance of Terms
              </Text>
              <Text as="p">
                By installing and using the App, you agree to be bound by these
                Terms of Service. If you do not agree to these terms, please
                uninstall the App.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Billing
              </Text>
              <Text as="p">
                All billing for the App is handled through Shopify's billing
                system. Any refunds for app charges follow Shopify's refund
                policies. Please refer to Shopify's documentation for details
                on billing and payment processing.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Data Accuracy
              </Text>
              <Text as="p">
                The analytics provided by the App are derived from data
                available through the Shopify GraphQL Admin API. While we strive
                to present this data accurately, we do not guarantee the
                accuracy, completeness, or timeliness of Shopify's underlying
                data. The App reflects what is reported by your store's API.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Limitation of Liability
              </Text>
              <Text as="p">
                The App provides analytics and reporting only. It should not be
                the sole basis for business, financial, or operational
                decisions. We are not liable for any losses or damages arising
                from reliance on the data displayed by the App.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Termination
              </Text>
              <Text as="p">
                You may terminate your use of the App at any time by
                uninstalling it from your Shopify admin. Upon uninstallation,
                all stored data associated with your shop is automatically
                deleted.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Changes to These Terms
              </Text>
              <Text as="p">
                We may update these Terms of Service from time to time.
                Continued use of the App after changes are posted constitutes
                your acceptance of the revised terms.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Governing Law
              </Text>
              <Text as="p">
                These terms are governed by and construed in accordance with
                applicable laws. Any disputes arising from the use of the App
                will be resolved under the jurisdiction of the applicable
                courts.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Contact
              </Text>
              <Text as="p">
                For questions about these terms, please contact us at{" "}
                <Link url="mailto:support@refundanalytics.com" external>
                  support@refundanalytics.com
                </Link>
                .
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
