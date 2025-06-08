import React, { ReactNode, useMemo } from "react";
import {
  CriterionModifier,
  TagDataFragment,
  TagFilterType,
  useFindTagsForSelectQuery,
} from "src/core/generated-graphql";
import { HierarchicalObjectsFilter } from "./SelectableFilter";
import { sortByRelevance } from "src/utils/query";
import { CriterionOption } from "src/models/list-filter/criteria/criterion";
import { ListFilterModel } from "src/models/list-filter/filter";
import {
  makeQueryVariables,
  setObjectFilter,
  useLabeledIdFilterState,
} from "./LabeledIdFilter";
import { SidebarListFilter } from "./SidebarListFilter";
import { TagsCriterion } from "src/models/list-filter/criteria/tags";
import { Tag, TagIDSelect } from "src/components/Tags/TagSelect";
import { FormattedMessage } from "react-intl";
import { Form } from "react-bootstrap";

interface ITagsFilter {
  criterion: TagsCriterion;
  setCriterion: (c: TagsCriterion) => void;
}

interface IHasModifier {
  modifier: CriterionModifier;
}

function queryVariables(query: string, f?: ListFilterModel) {
  const tagFilter: TagFilterType = {};

  if (f) {
    const filterOutput = f.makeFilter();

    // if tag modifier is includes, take it out of the filter
    if (
      (filterOutput.tags as IHasModifier)?.modifier ===
      CriterionModifier.Includes
    ) {
      delete filterOutput.tags;

      // TODO - look for same in AND?
    }

    setObjectFilter(tagFilter, f.mode, filterOutput);
  }

  return makeQueryVariables(query, { tag_filter: tagFilter });
}

function sortResults(
  query: string,
  tags: Pick<TagDataFragment, "id" | "name" | "aliases">[]
) {
  return sortByRelevance(
    query,
    tags ?? [],
    (t) => t.name,
    (t) => t.aliases
  ).map((p) => {
    return {
      id: p.id,
      label: p.name,
    };
  });
}

function useTagQueryFilter(
  query: string,
  filter?: ListFilterModel,
  skip?: boolean
) {
  const { data, loading } = useFindTagsForSelectQuery({
    variables: queryVariables(query, filter),
    skip,
  });

  const results = useMemo(
    () => sortResults(query, data?.findTags.tags ?? []),
    [data, query]
  );

  return { results, loading };
}

function useTagQuery(query: string, skip?: boolean) {
  return useTagQueryFilter(query, undefined, skip);
}

const TagsFilter: React.FC<ITagsFilter> = ({ criterion, setCriterion }) => {
  return (
    <HierarchicalObjectsFilter
      criterion={criterion}
      setCriterion={setCriterion}
      useResults={useTagQuery}
    />
  );
};

export const SidebarTagsFilter: React.FC<{
  title?: ReactNode;
  option: CriterionOption;
  filter: ListFilterModel;
  setFilter: (f: ListFilterModel) => void;
}> = ({ title, option, filter, setFilter }) => {
  const state = useLabeledIdFilterState({
    filter,
    setFilter,
    option,
    useQuery: useTagQueryFilter,
    hierarchical: true,
    includeSubMessageID: "sub_tags",
  });

  return <SidebarListFilter {...state} title={title} />;
};

export const TagFilterSelect: React.FC<ITagsFilter> = ({
  criterion,
  setCriterion,
}) => {
  const selectValue = useMemo(
    () => criterion.value.items.map((p) => p.id),
    [criterion.value]
  );

  function onSelect(tags: Tag[]) {
    const newCriterion = criterion.clone() as TagsCriterion;
    newCriterion.value = {
      ...criterion.value,
      items: tags.map((t) => ({ id: t.id, label: t.name })),
    };
    setCriterion(newCriterion);
  }

  function onChangeDepth(depth: number) {
    const newCriterion = criterion.clone() as TagsCriterion;
    newCriterion.value.depth = depth;
    setCriterion(newCriterion);
  }

  return (
    <div>
      <TagIDSelect
        isMulti
        onSelect={onSelect}
        ids={selectValue}
        menuPortalTarget={document.body}
      />
      <Form.Check
        type="checkbox"
        className="mt-2"
        checked={criterion.value.depth === -1}
        onChange={(e) => onChangeDepth(e.target.checked ? -1 : 0)}
        label={<FormattedMessage id="include_sub_tags" />}
      />
    </div>
  );
};

export default TagsFilter;
