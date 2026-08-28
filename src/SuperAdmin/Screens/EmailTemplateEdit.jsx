import { useLocation, useNavigate, useParams } from "react-router-dom";
import EmailTemplateEditor from "../../components/email/EmailTemplateEditor";
import emailTemplatesService from "../../services/emailTemplates.service";

/**
 * Route wrapper for the platform layer of one email.
 *
 * The editor itself is shared with the tenant portal (components/email) — all
 * this does is bind it to the SuperAdmin service and the console's routing.
 *
 * The list carries its view in the query string and hands it over on the way
 * in, so going back restores the category and search you opened this from
 * rather than dumping you at the top of the catalogue.
 */
export default function EmailTemplateEdit() {
  const { key } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();

  return (
    <EmailTemplateEditor
      service={emailTemplatesService}
      templateKey={key}
      backLabel="All emails"
      onBack={() => navigate({ pathname: "/emails", search })}
    />
  );
}
