import { SECTION_COMPONENTS } from "../config/sectionTypes";

/**
 * Renders an ordered list of CMS sections (the section-based page builder).
 * Skips archived sections and any whose `type` has no registered renderer, then
 * spreads each section's `data` as props into its component.
 */
export default function PageSections({ sections }) {
  if (!Array.isArray(sections)) return null;
  return (
    <>
      {sections
        .filter((s) => s && !s.archived && SECTION_COMPONENTS[s.type])
        .map((s) => {
          const Component = SECTION_COMPONENTS[s.type];
          return <Component key={s.id} {...(s.data || {})} />;
        })}
    </>
  );
}
