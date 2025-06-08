import React, { ReactNode, useMemo } from "react";
import {
  StudioDataFragment,
  StudioFilterType,
  useFindStudiosForSelectQuery,
} from "src/core/generated-graphql";
import { HierarchicalObjectsFilter } from "./SelectableFilter";
import { StudiosCriterion } from "src/models/list-filter/criteria/studios";
import { sortByRelevance } from "src/utils/query";
import { CriterionOption } from "src/models/list-filter/criteria/criterion";
import { ListFilterModel } from "src/models/list-filter/filter";
import {
  makeQueryVariables,
  setObjectFilter,
  useLabeledIdFilterState,
} from "./LabeledIdFilter";
import { SidebarListFilter } from "./SidebarListFilter";
import { Studio, StudioIDSelect } from "src/components/Studios/StudioSelect";
import { Form } from "react-bootstrap";
import { FormattedMessage } from "react-intl";

interface IStudiosFilter {
  criterion: StudiosCriterion;
  setCriterion: (c: StudiosCriterion) => void;
}

function queryVariables(query: string, f?: ListFilterModel) {
  const studioFilter: StudioFilterType = {};

  if (f) {
    const filterOutput = f.makeFilter();

    // always remove studio filter from the filter
    // since modifier is includes
    delete filterOutput.studios;

    // TODO - look for same in AND?

    setObjectFilter(studioFilter, f.mode, filterOutput);
  }

  return makeQueryVariables(query, { studio_filter: studioFilter });
}

function sortResults(
  query: string,
  studios: Pick<StudioDataFragment, "id" | "name" | "aliases">[]
) {
  return sortByRelevance(
    query,
    studios ?? [],
    (s) => s.name,
    (s) => s.aliases
  ).map((p) => {
    return {
      id: p.id,
      label: p.name,
    };
  });
}

function useStudioQueryFilter(
  query: string,
  filter?: ListFilterModel,
  skip?: boolean
) {
  const { data, loading } = useFindStudiosForSelectQuery({
    variables: queryVariables(query, filter),
    skip,
  });

  const results = useMemo(
    () => sortResults(query, data?.findStudios.studios ?? []),
    [data?.findStudios.studios, query]
  );

  return { results, loading };
}

function useStudioQuery(query: string, skip?: boolean) {
  return useStudioQueryFilter(query, undefined, skip);
}

const StudiosFilter: React.FC<IStudiosFilter> = ({
  criterion,
  setCriterion,
}) => {
  return (
    <HierarchicalObjectsFilter
      criterion={criterion}
      setCriterion={setCriterion}
      useResults={useStudioQuery}
      singleValue
    />
  );
};

export const SidebarStudiosFilter: React.FC<{
  title?: ReactNode;
  option: CriterionOption;
  filter: ListFilterModel;
  setFilter: (f: ListFilterModel) => void;
}> = ({ title, option, filter, setFilter }) => {
  const state = useLabeledIdFilterState({
    filter,
    setFilter,
    option,
    useQuery: useStudioQueryFilter,
    singleValue: true,
    hierarchical: true,
    includeSubMessageID: "subsidiary_studios",
  });

  return <SidebarListFilter {...state} title={title} />;
};

export const StudioFilterSelect: React.FC<IStudiosFilter> = ({
  criterion,
  setCriterion,
}) => {
  const selectValue = useMemo(
    () => criterion.value.items.map((p) => p.id),
    [criterion.value]
  );

  function onSelect(studios: Studio[]) {
    const newCriterion = criterion.clone() as StudiosCriterion;
    newCriterion.value = {
      ...criterion.value,
      items: studios.map((p) => ({ id: p.id, label: p.name })),
    };
    setCriterion(newCriterion);
  }

  function onChangeDepth(depth: number) {
    const newCriterion = criterion.clone() as StudiosCriterion;
    newCriterion.value.depth = depth;
    setCriterion(newCriterion);
  }

  return (
    <div>
      <StudioIDSelect
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
        label={<FormattedMessage id="include_sub_studios" />}
      />
    </div>
  );
};

export default StudiosFilter;
