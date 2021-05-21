import React from "react";
import * as GQL from "src/core/generated-graphql";

interface ITagDetails {
  tag: Partial<GQL.TagDataFragment>;
}

export const TagDetailsPanel: React.FC<ITagDetails> = ({ tag }) => {
  function renderAliasesField() {
    if (!tag.aliases?.length) {
      return;
    }

    return (
      <dl className="row">
        <dt className="col-3 col-xl-2">Aliases</dt>
        <dd className="col-9 col-xl-10">
          <ul className="pl-0">
            {tag.aliases.map((alias) => (
              <li key={alias} className="alias">
                {alias}
              </li>
            ))}
          </ul>
        </dd>
      </dl>
    );
  }

  return <>{renderAliasesField()}</>;
};