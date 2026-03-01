import { useOutletContext } from "react-router";
import { BetaBanner } from "./BetaBanner.jsx";
import { ReviewPrompt } from "./ReviewPrompt.jsx";

export function AppBanners() {
  const { isBeta, installedAt } = useOutletContext() || {};

  return (
    <>
      {isBeta && <BetaBanner />}
      <ReviewPrompt installedAt={installedAt} />
    </>
  );
}
