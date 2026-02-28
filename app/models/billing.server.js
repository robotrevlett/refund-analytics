import db from "../db.server.js";

const PLAN_FEATURES = {
  Starter: ["dashboard", "products", "sync", "settings"],
  Pro: ["dashboard", "products", "returns", "sync", "settings"],
};

export async function getActiveSubscription(admin) {
  const response = await admin.graphql(`#graphql
    query {
      appInstallation {
        activeSubscriptions {
          id
          name
          status
          test
          lineItems {
            plan {
              pricingDetails {
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                  interval
                }
              }
            }
          }
        }
      }
    }
  `);
  const { data } = await response.json();
  const subscriptions = data?.appInstallation?.activeSubscriptions || [];
  return subscriptions.find((s) => s.status === "ACTIVE") || null;
}

export async function syncSubscriptionStatus(admin, shop) {
  const subscription = await getActiveSubscription(admin);
  const planName = subscription?.name || null;

  await db.shop.update({
    where: { id: shop },
    data: { planName },
  });

  return { planName, subscription };
}

export function hasFeatureAccess(planName, feature) {
  if (!planName) return false;
  const features = PLAN_FEATURES[planName];
  if (!features) return false;
  return features.includes(feature);
}
