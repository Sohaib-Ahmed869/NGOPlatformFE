import { useLocation, useNavigate, useParams } from "react-router-dom";
import SendEmailPage from "../../components/email/SendEmailPage";
import emailTemplatesService from "../../services/emailTemplates.service";

/**
 * Route wrapper for sending an email by hand from the platform console.
 *
 * Serves both shapes from one component, because they are one screen with one
 * field switched off:
 *   /emails/compose      — free-form, no catalogue key
 *   /emails/send/:key    — one of the 43, with its variables
 *
 * `/emails/compose` sits ahead of `/emails/:key` only because React Router
 * ranks a static segment above a dynamic one; catalogue keys are dotted
 * (`donation.receipt`), so they can never collide with it anyway.
 *
 * The list carries its view in the query string and hands it over on the way
 * in, exactly as the editor route does — so going back restores the category
 * and search you left rather than the top of the catalogue.
 */
export default function EmailSend() {
  const { key } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();

  return (
    <SendEmailPage
      service={emailTemplatesService}
      templateKey={key || null}
      backLabel="All emails"
      onBack={() => navigate({ pathname: "/emails", search })}
    />
  );
}
