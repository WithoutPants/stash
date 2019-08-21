import * as React from "react";

import { Button, MenuItem } from "@blueprintjs/core";
import { ISelectProps, ItemPredicate, ItemRenderer, Select } from "@blueprintjs/select";
import * as GQL from "../../core/generated-graphql";
import { StashService } from "../../core/StashService";
import { HTMLInputProps } from "../../models";

const InternalPerformerSelect = Select.ofType<GQL.AllPerformersForFilterAllPerformers>();
const InternalTagSelect = Select.ofType<GQL.AllTagsForFilterAllTags>();
const InternalStudioSelect = Select.ofType<GQL.AllStudiosForFilterAllStudios>();

type ValidTypes =
  GQL.AllPerformersForFilterAllPerformers |
  GQL.AllTagsForFilterAllTags |
  GQL.AllStudiosForFilterAllStudios;

interface IProps extends HTMLInputProps {
  type: "performers" | "studios" | "tags";
  initialId?: string;
  onSelectItem: (item: ValidTypes) => void;
}

export const FilterSelect: React.FunctionComponent<IProps> = (props: IProps) => {
  let SelectImpl = getSelectImpl();
  let InternalSelect = SelectImpl.getInternalSelect();
  const data = SelectImpl.getData();

  const [selectedItem, setSelectedItem] = React.useState<ValidTypes | null>(null);
  const [items, setItems] = React.useState<ValidTypes[]>([]);
 
  React.useEffect(() => {
    if (!!data) {
      SelectImpl.translateData();
    }
  }, [data]);

  React.useEffect(() => {
    if (!!items) {
      const initialItem = items.find((item) => props.initialId === item.id);
      if (!!initialItem) {
        setSelectedItem(initialItem);
      } else {
        setSelectedItem(null);
      }
    }
  }, [props.initialId, items]);

  function getSelectImpl() {
    let getInternalSelect: () => new (props: ISelectProps<any>) => Select<any>;
    let getData: () => GQL.AllPerformersForFilterQuery | GQL.AllStudiosForFilterQuery | GQL.AllTagsForFilterQuery | undefined;
    let translateData: () => void;
    
    switch (props.type) {
      case "performers": {
        getInternalSelect = () => { return InternalPerformerSelect; };
        getData = () => { const { data } = StashService.useAllPerformersForFilter(); return data; }
        translateData = () => { let perfData = data as GQL.AllPerformersForFilterQuery; setItems(!!perfData && !!perfData.allPerformers ? perfData.allPerformers : []); };
        break;
      }
      case "studios": {
        getInternalSelect = () => { return InternalStudioSelect; };
        getData = () => { const { data } = StashService.useAllStudiosForFilter(); return data; }
        translateData = () => { let studioData = data as GQL.AllStudiosForFilterQuery; setItems(!!studioData && !!studioData.allStudios ? studioData.allStudios : []); };
        break;
      }
      case "tags": {
        getInternalSelect = () => { return InternalTagSelect; };
        getData = () => { const { data } = StashService.useAllTagsForFilter(); return data; }
        translateData = () => { let tagData = data as GQL.AllTagsForFilterQuery; setItems(!!tagData && !!tagData.allTags ? tagData.allTags : []); };
        break;
      }
      default: {
        throw "Unhandled case in FilterMultiSelect";
      }
    }

    return {
      getInternalSelect: getInternalSelect,
      getData: getData,
      translateData: translateData
    };
  }

  const renderItem: ItemRenderer<ValidTypes> = (item, itemProps) => {
    if (!itemProps.modifiers.matchesPredicate) { return null; }
    return (
      <MenuItem
        active={itemProps.modifiers.active}
        disabled={itemProps.modifiers.disabled}
        key={item.id}
        onClick={itemProps.handleClick}
        text={item.name}
        shouldDismissPopover={false}
      />
    );
  };

  const filter: ItemPredicate<ValidTypes> = (query, item) => {
    return item.name!.toLowerCase().indexOf(query.toLowerCase()) >= 0;
  };

  function onItemSelect(item: ValidTypes) {
    props.onSelectItem(item);
    setSelectedItem(item);
  }

  const buttonText = selectedItem ? selectedItem.name : "(No selection)";
  return (
    <InternalSelect
      items={items}
      itemRenderer={renderItem}
      itemPredicate={filter}
      noResults={<MenuItem disabled={true} text="No results." />}
      onItemSelect={onItemSelect}
      popoverProps={{position: "bottom"}}
      {...props}
    >
      <Button fill={true} text={buttonText} />
    </InternalSelect>
  );
};
