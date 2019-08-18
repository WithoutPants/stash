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
import { SceneSelectedOptions } from "./SceneSelectedOptions";
import * as GQL from "../../core/generated-graphql";

interface ISceneListProps extends IBaseProps {}

export const SceneList: FunctionComponent<ISceneListProps> = (props: ISceneListProps) => {
  const [selectedScenes, setSelectedScenes] = useState<Map<string, boolean>>(new Map());
  const [selectedSceneArray, setSelectedSceneArray] = useState<GQL.SlimSceneDataFragment[]>([]);
  
  // for shift-selection
  const [lastClickedScene, setLastClickedScene] = useState<GQL.SlimSceneDataFragment | undefined>();
  
  const listData = ListHook.useList({
    filterMode: FilterMode.Scenes,
    props,
    renderContent,
    renderSelectedOptions,
    onSelectAll: onSelectAll,
    onSelectNone: onSelectNone
  });

  function sceneSelected(scene : GQL.SlimSceneDataFragment) {
    setLastClickedScene(scene);
    
    var prevValue : boolean | undefined = false;
    if (selectedScenes) {
      prevValue = !!selectedScenes.get(scene.id);
      selectedScenes.set(scene.id, !prevValue);
      setSelectedScenes(selectedScenes);
      
      if (prevValue) {
        // remove object from array
        var index = selectedSceneArray.indexOf(scene);
        if (index !== -1) {
          selectedSceneArray.splice(index, 1);
        }
      } else {
        // add to the array
        selectedSceneArray.push(scene);
      }

      setSelectedSceneArray(selectedSceneArray.slice());
    }
  }

  function multiSelect(data : FindScenesQuery | undefined, scene : GQL.SlimSceneDataFragment) {
    let startIndex = 0;
    let thisIndex = -1;

    if (data) {
      if (!!lastClickedScene) {
        startIndex = data.findScenes.scenes.indexOf(lastClickedScene);
      }

      thisIndex = data.findScenes.scenes.indexOf(scene);
      selectRange(data, startIndex, thisIndex);
    }
  }

  function selectRange(data : FindScenesQuery | undefined, startIndex : number, endIndex : number) {
    if (startIndex > endIndex) {
      let tmp = startIndex;
      startIndex = endIndex;
      endIndex = tmp;
    }

    if (data) {
      let subset = data.findScenes.scenes.slice(startIndex, endIndex + 1);
      
      selectedScenes.clear();
      subset.forEach((scene) => {
        selectedScenes.set(scene.id, true);
      });

      setSelectedScenes(selectedScenes);
      setSelectedSceneArray(subset);
    }
  }

  function onScenesUpdated() {
    listData.refresh();
  }

  function onSelectAll(scenes: QueryHookResult<FindScenesQuery, FindScenesVariables>) {
    var newSelectedScenes = new Map();
    var newSelectedSceneArray : GQL.SlimSceneDataFragment[] = [];
    
    if (!scenes.data || !scenes.data.findScenes) { return; }

    scenes.data.findScenes.scenes.forEach((scene) => {
      newSelectedScenes.set(scene.id, true);
      newSelectedSceneArray.push(scene);
    });

    setSelectedScenes(newSelectedScenes);
    setSelectedSceneArray(newSelectedSceneArray);
  }

  function onSelectNone() {
    setSelectedScenes(new Map());
    setSelectedSceneArray([]);
  }

  function renderSelectedOptions() {
    return (
      <>
      {selectedSceneArray && selectedSceneArray.length > 0 ? <SceneSelectedOptions selected={selectedSceneArray} onScenesUpdated={() => onScenesUpdated()}/> : undefined}
      </>
    );
  }

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
              onSelectedChanged={(_, shiftKey) => {
                if (shiftKey) {
                  multiSelect(result.data, scene);
                } else {
                  sceneSelected(scene);
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
