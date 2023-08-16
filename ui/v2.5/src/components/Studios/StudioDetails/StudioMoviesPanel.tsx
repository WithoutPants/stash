import React from "react";
import * as GQL from "src/core/generated-graphql";
import { MovieList } from "src/components/Movies/MovieList";
import { useStudioFilterHook } from "src/core/studios";
import { PersistanceLevel } from "src/components/List/ItemList";

interface IStudioMoviesPanel {
  active: boolean;
  studio: GQL.StudioDataFragment;
}

export const StudioMoviesPanel: React.FC<IStudioMoviesPanel> = ({
  active,
  studio,
}) => {
  const filterHook = useStudioFilterHook(studio);
  return (
    <MovieList
      filterHook={filterHook}
      alterQuery={active}
      persistState={PersistanceLevel.SAVEDVIEW}
    />
  );
};
