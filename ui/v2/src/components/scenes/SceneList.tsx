import _ from "lodash";
import React, { FunctionComponent, useState } from "react";
import { QueryHookResult } from "react-apollo-hooks";
import { FindScenesQuery, FindScenesVariables } from "../../core/generated-graphql";
import { ListHook } from "../../hooks/ListHook";
import { IBaseProps } from "../../models/base-props";
import { ListFilterModel } from "../../models/list-filter/filter";
import { DisplayMode, FilterMode } from "../../models/list-filter/types";
import { WallPanel } from "../Wall/WallPanel";
import { SceneCard } from "./SceneCard";

interface ISceneListProps extends IBaseProps {}

export const SceneList: FunctionComponent<ISceneListProps> = (props: ISceneListProps) => {
  const listData = ListHook.useList({
    filterMode: FilterMode.Scenes,
    props,
    renderContent,
  });

  const [selectedScenes, setSelectedScenes] = useState<Map<string, boolean>>(new Map());

  function renderContent(result: QueryHookResult<FindScenesQuery, FindScenesVariables>, filter: ListFilterModel) {
    if (!result.data || !result.data.findScenes) { return; }
    if (filter.displayMode === DisplayMode.Grid) {
      return (
        <div className="grid">
          {result.data.findScenes.scenes.map((scene) => (
            <SceneCard 
              key={scene.id} 
              scene={scene}
              selected={selectedScenes && selectedScenes.get(scene.id)}
              onSelectedChanged={() => {
                if (selectedScenes) {
                  selectedScenes.set(scene.id, !selectedScenes.get(scene.id));
                  setSelectedScenes(selectedScenes);
                }
              }} />)
          )}
        </div>
      );
    } else if (filter.displayMode === DisplayMode.List) {
      return <h1>TODO</h1>;
    } else if (filter.displayMode === DisplayMode.Wall) {
      return <WallPanel scenes={result.data.findScenes.scenes} />;
    }
  }

  return listData.template;
};
