import { json } from "@remix-run/node";
import {
  Page,
  Card,
  BlockStack,
  Text,
  List,
  Link,
  Layout,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({});
};

export default function AppPrivacyPolicy() {
  return (
    <Page title="Privacy Policy" backAction={{ url: "/app/settings" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="p" tone="subdued">
                Last updated: February 2026
              </Text>
              <Text as="p">
                Refund &amp; Return Analytics ("the App") is a Shopify
                application that helps merchants understand their refund and
                return data. This policy explains what data the App accesses,
                how it is stored, and your rights regarding that data.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Data We Collect
              </Text>
              <Text as="p">
                The App fetches the following data from your Shopify store via
                the Shopify GraphQL Admin API:
              </Text>
              <List>
                <List.Item>Order IDs and order names</List.Item>
                <List.Item>Refund amounts, dates, and notes</List.Item>
                <List.Item>
                  Product titles and SKUs associated with refunded line items
                </List.Item>
                <List.Item>
                  Return reasons (when a refund is linked to a return)
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Data We Do Not Collect
              </Text>
              <Text as="p">The App does not collect or store:</Text>
              <List>
                <List.Item>
                  Customer names, email addresses, or physical addresses
                </List.Item>
                <List.Item>Payment or credit card information</List.Item>
                <List.Item>
                  Browsing behavior or analytics about your customers
                </List.Item>
              </List>
              <Text as="p">
                The App does not use cookies, tracking pixels, or any
                third-party analytics services.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                How Data Is Stored
              </Text>
              <Text as="p">
                All data is stored in our secure database and is associated with
                your shop domain only. Your data is not shared with, sold to, or
                accessed by any third parties.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                GDPR Compliance
              </Text>
              <Text as="p">
                The App implements all required Shopify compliance webhooks:
              </Text>
              <List>
                <List.Item>
                  <Text as="span" fontWeight="semibold">
                    Customer data request
                  </Text>{" "}
                  — Acknowledged. The App does not store customer-keyed
                  personally identifiable information.
                </List.Item>
                <List.Item>
                  <Text as="span" fontWeight="semibold">
                    Customer redact
                  </Text>{" "}
                  — Deletes any order and refund records that may be linked to
                  the specified customer.
                </List.Item>
                <List.Item>
                  <Text as="span" fontWeight="semibold">
                    Shop redact
                  </Text>{" "}
                  — Purges all stored data for the shop upon request.
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Data Retention
              </Text>
              <Text as="p">
                All data associated with your shop is automatically deleted when
                the App is uninstalled (via the app/uninstalled webhook) or when
                a shop redact request is received from Shopify.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Data Access
              </Text>
              <Text as="p">
                Merchants can view all data stored by the App within the{" "}
                <Link url="/app/settings">Settings</Link> page inside the
                application.
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
                For privacy-related inquiries, please contact us at{" "}
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
