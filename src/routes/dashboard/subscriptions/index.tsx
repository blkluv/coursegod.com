import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$ } from "@builder.io/qwik-city";
import Pricing from "~/components/starter/pricing/pricing";
import Stripe from "stripe";
import db from "../../../../drizzle/db";
import { users } from "../../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { Session } from "@auth/core/types";
import { currentSubscription } from "~/ultils/subscriptions";

export const useSubscriptionStatus = routeLoader$(
  async ({ sharedMap, url, redirect, env }) => {
    const authSession: Session | null = sharedMap.get("session");
    if (!authSession || new Date(authSession.expires) < new Date()) {
      throw redirect(302, `/sign-in?callbackUrl=${url.pathname}`);
    }
    const email = authSession.user?.email;
    const response = await currentSubscription(email as string);
    return response;
  },
);

export const useSubscriptionData = routeLoader$(
  async ({ sharedMap, redirect, url, env }) => {
    const stripe = new Stripe(env.get("STRIPE_TEST_KEY")!, {
      apiVersion: "2023-10-16",
    });
    const authSession: Session | null = sharedMap.get("session");
    if (!authSession || new Date(authSession.expires) < new Date()) {
      throw redirect(302, `/sign-in?callbackUrl=${url.pathname}`);
    }
    const email = authSession.user?.email;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email as string));

    if (!user[0].stripe_id?.includes("cus")) {
      return {
        url: `${env.get("BASE_URL")!}no-subscriptions`,
      };
    }
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user[0].stripe_id,
      return_url: `${env.get("BASE_URL")!}dashboard/subscriptions`,
    });

    return {
      url: portalSession.url,
    };
  },
);

export default component$(() => {
  const subscriptionData = useSubscriptionData();
  const url = subscriptionData.value.url;
  const subscriptionstatus = useSubscriptionStatus();
  const status = subscriptionstatus.value.plan;
  console.log(status);

  return (
    <>
      <div class="grid grid-cols-1 justify-center gap-10 p-4 md:grid-cols-3 ">
        <div class="max-w-sm rounded-lg border border-gray-200  bg-slate-900 p-6 shadow ">
          <a href="#">
            <h5 class="mb-2 text-2xl font-bold tracking-tight text-white">
              Current subscription
            </h5>
          </a>
          {status === "Legend" && (
            <p class="mb-3 text-lg font-bold text-yellow-400">Legend 👑</p>
          )}
          {status === "Premium" && (
            <p class="mb-3 text-lg font-bold text-yellow-400">Premium ⚜️</p>
          )}
          {status === "Normal" && (
            <p class="mb-3 text-lg font-bold text-yellow-400">Normal 🛡️</p>
          )}
          {status === "No Subscription" && (
            <p class="mb-3 text-lg font-bold text-white">No subscription :(</p>
          )}
        </div>
        <div class="max-w-sm rounded-lg border border-gray-200 bg-slate-900 p-6 shadow">
          <a href="#">
            <h5 class="mb-2 text-2xl font-bold tracking-tight text-white ">
              Manage
            </h5>
          </a>
          <p class="mb-3 font-normal text-white">Manage your subscription(s)</p>
          <Link href={url}>
            <button class="flex items-center px-4 py-2 text-black">
              Manage subscription(s)
            </button>
          </Link>
        </div>
        <div class="max-w-sm rounded-lg border border-gray-200 bg-slate-900   p-6 shadow">
          <a href="#">
            <h5 class="mb-2 text-2xl font-bold tracking-tight text-white">
              Cancel
            </h5>
          </a>
          <p class="mb-3 font-normal text-white">Cancel your subscription(s)</p>
          <Link href={url}>
            <button class="flex items-center bg-red-400 px-4 py-2 text-black">
              Cancel subscription(s)
            </button>
          </Link>
        </div>
      </div>
      <div id="pricing" class="mt-10">
        <Pricing />
      </div>
    </>
  );
});
