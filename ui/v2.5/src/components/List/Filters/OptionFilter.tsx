import cloneDeep from "lodash-es/cloneDeep";
import React, { useMemo } from "react";
import { Form } from "react-bootstrap";
import {
  CriterionValue,
  ModifierCriterion,
} from "src/models/list-filter/criteria/criterion";
import { SelectComponent } from "src/components/Shared/FilterSelect";

interface IOptionsFilter {
  criterion: ModifierCriterion<CriterionValue>;
  setCriterion: (c: ModifierCriterion<CriterionValue>) => void;
}

export const OptionFilter: React.FC<IOptionsFilter> = ({
  criterion,
  setCriterion,
}) => {
  function onSelect(v: string) {
    const c = cloneDeep(criterion);
    if (c.value === v) {
      c.value = "";
    } else {
      c.value = v;
    }

    setCriterion(c);
  }

  const { options } = criterion.modifierCriterionOption();

  if (!options || options.length === 0) {
    throw new Error(
      `OptionFilter: No options found for criterion ${criterion.getId()}`
    );
  }

  return (
    <div className="option-list-filter">
      <Form.Control
        as="select"
        className="input-control"
        value={criterion.value as string}
        onChange={(e) => onSelect(e.target.value)}
      >
        {options
          .map((o) => o.toString())
          .map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
      </Form.Control>
    </div>
  );
};

interface IOptionsListFilter {
  criterion: ModifierCriterion<CriterionValue>;
  setCriterion: (c: ModifierCriterion<CriterionValue>) => void;
}

export const OptionListFilter: React.FC<IOptionsListFilter> = ({
  criterion,
  setCriterion,
}) => {
  const { options } = criterion.modifierCriterionOption();
  const value = criterion.value as string[];

  const selectOptions = useMemo(() => {
    return (
      options?.map((o) => ({
        value: o.toString(),
        label: o.toString(),
      })) ?? []
    );
  }, [options]);

  const selectValue = useMemo(() => {
    return value.map(
      (v) => selectOptions.find((o) => o.value === v) ?? { value: v, label: v }
    );
  }, [selectOptions, value]);

  return (
    <div className="option-list-filter">
      <SelectComponent
        isMulti
        isClearable
        isSearchable={(options ?? []).length > 10}
        closeMenuOnSelect={false}
        className="input-control"
        selectedOptions={selectValue}
        onChange={(selected) => {
          const newValue = selected.map((s) => s.value);
          const c = cloneDeep(criterion);
          c.value = newValue;
          setCriterion(c);
        }}
        options={selectOptions}
        menuPortalTarget={document.body}
      />
    </div>
  );
};
