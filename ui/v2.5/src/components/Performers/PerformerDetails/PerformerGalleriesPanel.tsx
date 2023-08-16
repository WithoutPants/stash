import React from "react";
import * as GQL from "src/core/generated-graphql";
import { GalleryList } from "src/components/Galleries/GalleryList";
import { usePerformerFilterHook } from "src/core/performers";
import { PersistanceLevel } from "src/components/List/ItemList";

interface IPerformerDetailsProps {
  active: boolean;
  performer: GQL.PerformerDataFragment;
}

export const PerformerGalleriesPanel: React.FC<IPerformerDetailsProps> = ({
  active,
  performer,
}) => {
  const filterHook = usePerformerFilterHook(performer);
  return (
    <GalleryList
      filterHook={filterHook}
      alterQuery={active}
      persistState={PersistanceLevel.SAVEDVIEW}
    />
  );
};
