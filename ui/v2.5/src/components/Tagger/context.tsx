import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  initialConfig,
  ITaggerConfig,
  LOCAL_FORAGE_KEY,
} from "src/components/Tagger/constants";
import * as GQL from "src/core/generated-graphql";
import {
  queryFindPerformer,
  queryFindStudio,
  queryScrapeScene,
  queryScrapeSceneQuery,
  queryScrapeSceneQueryFragment,
  stashBoxSceneBatchQuery,
  useListSceneScrapers,
  usePerformerCreate,
  usePerformerUpdate,
  useSceneUpdate,
  useStudioCreate,
  useStudioUpdate,
  useTagCreate,
} from "src/core/StashService";
import { useLocalForage } from "src/hooks/LocalForage";
import { useToast } from "src/hooks/Toast";
import { ConfigurationContext } from "src/hooks/Config";
import { ITaggerSource, SCRAPER_PREFIX, STASH_BOX_PREFIX } from "./constants";
import { errorToString } from "src/utils";
import { mergeStudioStashIDs } from "./utils";
import { compareScenesForSort } from "./scenes/utils";

interface IHasName {
  name?: GQL.Maybe<string> | undefined;
}

export type CreatedObject<T extends IHasName> = { obj: T; id: string };

export interface ITaggerContextState {
  config: ITaggerConfig;
  setConfig: (c: ITaggerConfig) => void;
  loading: boolean;
  loadingMulti?: boolean;
  multiError?: string;
  sources: ITaggerSource[];
  currentSource?: ITaggerSource;
  searchResults: Record<string, ISceneQueryResult>;
  setCurrentSource: (src?: ITaggerSource) => void;
  doSceneQuery: (
    scene: GQL.SlimSceneDataFragment,
    searchStr: string
  ) => Promise<void>;
  doSceneFragmentScrape: (scene: GQL.SlimSceneDataFragment) => Promise<void>;
  doMultiSceneFragmentScrape: (
    scenes: GQL.SlimSceneDataFragment[]
  ) => Promise<void>;
  stopMultiScrape: () => void;
  createNewTag: (
    tag: GQL.ScrapedTag,
    toCreate: GQL.TagCreateInput,
    remap?: boolean
  ) => Promise<string | undefined>;
  postCreateNewTags(tags: CreatedObject<GQL.ScrapedTag>[]): void;
  createNewPerformer: (
    performer: GQL.ScrapedPerformer,
    toCreate: GQL.PerformerCreateInput,
    remap?: boolean
  ) => Promise<string | undefined>;
  postCreateNewPerformers(
    performers: CreatedObject<GQL.ScrapedPerformer>[]
  ): void;
  linkPerformer: (
    performer: GQL.ScrapedPerformer,
    performerID: string
  ) => Promise<void>;
  createNewStudio: (
    studio: GQL.ScrapedStudio,
    toCreate: GQL.StudioCreateInput,
    remap?: boolean
  ) => Promise<string | undefined>;
  postCreateNewStudios(studios: CreatedObject<GQL.ScrapedStudio>[]): void;
  updateStudio: (studio: GQL.StudioUpdateInput) => Promise<void>;
  linkStudio: (studio: GQL.ScrapedStudio, studioID: string) => Promise<void>;
  resolveScene: (
    sceneID: string,
    index: number,
    scene: IScrapedScene
  ) => Promise<void>;
  submitFingerprints: () => Promise<void>;
  pendingFingerprints: string[];
  saveScene: (
    sceneCreateInput: GQL.SceneUpdateInput,
    queueFingerprint: boolean
  ) => Promise<void>;
}

export const TaggerStateContext =
  React.createContext<ITaggerContextState | null>(null);

export const useTagger = () => {
  const context = React.useContext(TaggerStateContext);

  if (context === null) {
    throw new Error("useTagger must be used within a TaggerContext");
  }

  return context;
};

export type IScrapedScene = GQL.ScrapedScene & { resolved?: boolean };

export interface ISceneQueryResult {
  results?: IScrapedScene[];
  error?: string;
}

function mapResults(
  searchResults: Record<string, ISceneQueryResult>,
  fn: (r: IScrapedScene) => IScrapedScene
) {
  const newSearchResults = { ...searchResults };

  Object.keys(newSearchResults).forEach((k) => {
    const searchResult = searchResults[k];
    if (!searchResult.results) {
      return;
    }

    newSearchResults[k] = {
      ...searchResults[k],
      results: searchResult.results.map(fn),
    };
  });

  return newSearchResults;
}

export const TaggerContext: React.FC = ({ children }) => {
  const [{ data: config }, setConfig] = useLocalForage<ITaggerConfig>(
    LOCAL_FORAGE_KEY,
    initialConfig
  );

  const [loading, setLoading] = useState(false);
  const [loadingMulti, setLoadingMulti] = useState(false);
  const [sources, setSources] = useState<ITaggerSource[]>([]);
  const [currentSource, setCurrentSource] = useState<ITaggerSource>();
  const [multiError, setMultiError] = useState<string | undefined>();
  const [searchResults, setSearchResults] = useState<
    Record<string, ISceneQueryResult>
  >({});

  const stopping = useRef(false);

  const { configuration: stashConfig } = React.useContext(ConfigurationContext);
  const Scrapers = useListSceneScrapers();

  const Toast = useToast();
  const [createTag] = useTagCreate();
  const [createPerformer] = usePerformerCreate();
  const [updatePerformer] = usePerformerUpdate();
  const [createStudio] = useStudioCreate();
  const [updateStudio] = useStudioUpdate();
  const [updateScene] = useSceneUpdate();

  useEffect(() => {
    if (!stashConfig || !Scrapers.data) {
      return;
    }

    const { stashBoxes } = stashConfig.general;
    const scrapers = Scrapers.data.listScrapers;

    const stashboxSources: ITaggerSource[] = stashBoxes.map((s, i) => ({
      id: `${STASH_BOX_PREFIX}${s.endpoint}`,
      sourceInput: {
        stash_box_endpoint: s.endpoint,
      },
      displayName: `stash-box: ${s.name || `#${i + 1}`}`,
      supportSceneFragment: true,
      supportSceneQuery: true,
    }));

    // filter scraper sources such that only those that can query scrape or
    // scrape via fragment are added
    const scraperSources: ITaggerSource[] = scrapers
      .filter((s) =>
        s.scene?.supported_scrapes.some(
          (t) => t === GQL.ScrapeType.Name || t === GQL.ScrapeType.Fragment
        )
      )
      .map((s) => ({
        id: `${SCRAPER_PREFIX}${s.id}`,
        sourceInput: {
          scraper_id: s.id,
        },
        displayName: s.name,
        supportSceneQuery: s.scene?.supported_scrapes.includes(
          GQL.ScrapeType.Name
        ),
        supportSceneFragment: s.scene?.supported_scrapes.includes(
          GQL.ScrapeType.Fragment
        ),
      }));

    setSources(stashboxSources.concat(scraperSources));
  }, [Scrapers.data, stashConfig]);

  useEffect(() => {
    if (sources.length && !currentSource) {
      setCurrentSource(sources[0]);
    }
  }, [sources, currentSource]);

  useEffect(() => {
    setSearchResults({});
  }, [currentSource]);

  function getPendingFingerprints() {
    const endpoint = currentSource?.sourceInput.stash_box_endpoint;
    if (!config || !endpoint) return [];

    return config.fingerprintQueue[endpoint] ?? [];
  }

  function clearSubmissionQueue() {
    const endpoint = currentSource?.sourceInput.stash_box_endpoint;
    if (!config || !endpoint) return;

    setConfig({
      ...config,
      fingerprintQueue: {
        ...config.fingerprintQueue,
        [endpoint]: [],
      },
    });
  }

  const [submitFingerprintsMutation] =
    GQL.useSubmitStashBoxFingerprintsMutation();

  async function submitFingerprints() {
    const endpoint = currentSource?.sourceInput.stash_box_endpoint;

    if (!config || !endpoint) return;

    try {
      setLoading(true);
      await submitFingerprintsMutation({
        variables: {
          input: {
            stash_box_endpoint: endpoint,
            scene_ids: config.fingerprintQueue[endpoint],
          },
        },
      });

      clearSubmissionQueue();
    } catch (err) {
      Toast.error(err);
    } finally {
      setLoading(false);
    }
  }

  const queueFingerprintSubmission = useCallback(
    (sceneId: string) => {
      const endpoint = currentSource?.sourceInput.stash_box_endpoint;
      if (!endpoint) return;

      setConfig((current) => {
        if (!current) return current;

        return {
          ...current,
          fingerprintQueue: {
            ...current.fingerprintQueue,
            [endpoint]: [
              ...(current.fingerprintQueue[endpoint] ?? []),
              sceneId,
            ],
          },
        };
      });
    },
    [currentSource?.sourceInput.stash_box_endpoint, setConfig]
  );

  const clearSearchResults = useCallback((sceneID: string) => {
    setSearchResults((current) => {
      const newSearchResults = { ...current };
      delete newSearchResults[sceneID];
      return newSearchResults;
    });
  }, []);

  const sortResults = useCallback(
    (target: GQL.SlimSceneDataFragment, unsortedScenes: IScrapedScene[]) => {
      return unsortedScenes
        .slice()
        .sort((scrapedSceneA, scrapedSceneB) =>
          compareScenesForSort(target, scrapedSceneA, scrapedSceneB)
        );
    },
    []
  );

  function setResolved(value: boolean) {
    return (scene: IScrapedScene) => {
      return { ...scene, resolved: value };
    };
  }

  const doSceneQuery = useCallback(
    async (scene: GQL.SlimSceneDataFragment, searchVal: string) => {
      if (!currentSource) {
        return;
      }

      const sceneID = scene.id;

      try {
        setLoading(true);
        clearSearchResults(sceneID);

        const results = await queryScrapeSceneQuery(
          currentSource.sourceInput,
          searchVal
        );
        let newResult: ISceneQueryResult;
        // scenes are already resolved if they come from stash-box
        const resolved =
          currentSource.sourceInput.stash_box_endpoint !== undefined;

        if (results.error) {
          newResult = { error: results.error.message };
        } else if (results.errors) {
          newResult = { error: results.errors.toString() };
        } else {
          const unsortedResults = results.data.scrapeSingleScene.map(
            setResolved(resolved)
          );

          newResult = {
            results: sortResults(scene, unsortedResults),
          };
        }

        setSearchResults((current) => ({ ...current, [sceneID]: newResult }));
      } catch (err) {
        Toast.error(err);
      } finally {
        setLoading(false);
      }
    },
    [Toast, currentSource, clearSearchResults, sortResults]
  );

  const sceneFragmentScrape = useCallback(
    async (scene: GQL.SlimSceneDataFragment) => {
      if (!currentSource) {
        return;
      }

      const sceneID = scene.id;

      clearSearchResults(sceneID);

      let newResult: ISceneQueryResult;

      try {
        const results = await queryScrapeScene(
          currentSource.sourceInput,
          sceneID
        );

        if (results.error) {
          newResult = { error: results.error.message };
        } else if (results.errors) {
          newResult = { error: results.errors.toString() };
        } else {
          // scenes are already resolved if they are scraped via fragment
          const resolved = true;
          const unsortedResults = results.data.scrapeSingleScene.map(
            setResolved(resolved)
          );

          newResult = {
            results: sortResults(scene, unsortedResults),
          };
        }
      } catch (err: unknown) {
        newResult = { error: errorToString(err) };
      }

      setSearchResults((current) => {
        return { ...current, [sceneID]: newResult };
      });
    },
    [currentSource, clearSearchResults, sortResults]
  );

  const doSceneFragmentScrape = useCallback(
    async (scene: GQL.SlimSceneDataFragment) => {
      if (!currentSource) {
        return;
      }

      const sceneID = scene.id;

      clearSearchResults(sceneID);

      try {
        setLoading(true);
        await sceneFragmentScrape(scene);
      } catch (err) {
        Toast.error(err);
      } finally {
        setLoading(false);
      }
    },
    [Toast, currentSource, sceneFragmentScrape, clearSearchResults]
  );

  const doMultiSceneFragmentScrape = useCallback(
    async (scenes: GQL.SlimSceneDataFragment[]) => {
      if (!currentSource) {
        return;
      }

      const sceneIDs = scenes.map((s) => s.id);

      setSearchResults({});

      try {
        stopping.current = false;
        setLoading(true);
        setMultiError(undefined);

        const stashBoxIndex =
          currentSource?.sourceInput.stash_box_endpoint ?? undefined;

        // if current source is stash-box, we can use the multi-scene
        // interface
        if (stashBoxIndex !== undefined) {
          const results = await stashBoxSceneBatchQuery(
            sceneIDs,
            stashBoxIndex
          );

          if (results.error) {
            setMultiError(results.error.message);
          } else if (results.errors) {
            setMultiError(results.errors.toString());
          } else {
            setSearchResults((current) => {
              const newSearchResults = { ...current };
              sceneIDs.forEach((sceneID, index) => {
                const resolved = true;
                const unsortedResults = results.data.scrapeMultiScenes[
                  index
                ].map(setResolved(resolved));

                newSearchResults[sceneID] = {
                  results: sortResults(scenes[index], unsortedResults),
                };
              });

              return newSearchResults;
            });
          }
        } else {
          setLoadingMulti(true);

          // do singular calls
          await scenes.reduce(async (promise, scene) => {
            await promise;
            if (!stopping.current) {
              await sceneFragmentScrape(scene);
            }
          }, Promise.resolve());
        }
      } catch (err) {
        Toast.error(err);
      } finally {
        setLoading(false);
        setLoadingMulti(false);
      }
    },
    [Toast, currentSource, sceneFragmentScrape, sortResults]
  );

  function stopMultiScrape() {
    stopping.current = true;
  }

  const resolveScene = useCallback(
    async (sceneID: string, index: number, scene: IScrapedScene) => {
      if (!currentSource || scene.resolved || !searchResults[sceneID].results) {
        return Promise.resolve();
      }

      try {
        const sceneInput: GQL.ScrapedSceneInput = {
          date: scene.date,
          details: scene.details,
          remote_site_id: scene.remote_site_id,
          title: scene.title,
          urls: scene.urls,
        };

        const result = await queryScrapeSceneQueryFragment(
          currentSource.sourceInput,
          sceneInput
        );

        if (result.data.scrapeSingleScene.length) {
          const resolvedScene = result.data.scrapeSingleScene[0];

          // set the scene in the results and mark as resolved
          setSearchResults((current) => {
            const newResult = [...current[sceneID].results!];
            newResult[index] = { ...resolvedScene, resolved: true };
            return {
              ...current,
              [sceneID]: { ...current[sceneID], results: newResult },
            };
          });
        }
      } catch (err) {
        Toast.error(err);

        setSearchResults((current) => {
          const newResult = [...current[sceneID].results!];
          newResult[index] = { ...newResult[index], resolved: true };
          return {
            ...current,
            [sceneID]: { ...current[sceneID], results: newResult },
          };
        });
      }
    },
    [Toast, currentSource, searchResults]
  );

  const saveScene = useCallback(
    async (
      sceneCreateInput: GQL.SceneUpdateInput,
      queueFingerprint: boolean
    ) => {
      try {
        await updateScene({
          variables: {
            input: {
              ...sceneCreateInput,
              // only set organized if it is enabled in the config
              organized: config?.markSceneAsOrganizedOnSave || undefined,
            },
          },
        });

        if (queueFingerprint) {
          queueFingerprintSubmission(sceneCreateInput.id);
        }
        clearSearchResults(sceneCreateInput.id);
      } catch (err) {
        Toast.error(err);
      } finally {
        setLoading(false);
      }
    },
    [
      queueFingerprintSubmission,
      clearSearchResults,
      Toast,
      config?.markSceneAsOrganizedOnSave,
      updateScene,
    ]
  );

  const postCreateNewTags = useCallback(
    (tags: CreatedObject<GQL.ScrapedTag>[]) => {
      setSearchResults((current) => {
        return mapResults(current, (r) => {
          if (!r.tags) {
            return r;
          }

          return {
            ...r,
            tags: r.tags.map((p) => {
              const tag = tags.find((e) => e.obj.name === p.name);
              if (tag) {
                return {
                  ...p,
                  stored_id: tag.id,
                };
              }

              return p;
            }),
          };
        });
      });
    },
    []
  );

  const createNewTag = useCallback(
    async (
      tag: GQL.ScrapedTag,
      toCreate: GQL.TagCreateInput,
      remap?: boolean
    ) => {
      try {
        const result = await createTag({
          variables: {
            input: toCreate,
          },
        });

        const tagID = result.data?.tagCreate?.id;
        if (tagID === undefined) return undefined;

        if (remap && tag.name !== undefined && tag.name !== null) {
          postCreateNewTags([{ obj: tag, id: tagID }]);
        }

        Toast.success(
          <span>
            Created tag: <b>{toCreate.name}</b>
          </span>
        );

        return tagID;
      } catch (e) {
        Toast.error(e);
      }
    },
    [Toast, createTag, postCreateNewTags]
  );

  const postCreateNewPerformers = useCallback(
    (performers: CreatedObject<GQL.ScrapedPerformer>[]) => {
      setSearchResults((current) => {
        return mapResults(current, (r) => {
          if (!r.performers) {
            return r;
          }

          return {
            ...r,
            performers: r.performers.map((p) => {
              const performer = performers.find((e) => e.obj.name === p.name);
              if (performer) {
                return {
                  ...p,
                  stored_id: performer.id,
                };
              }

              return p;
            }),
          };
        });
      });
    },
    []
  );

  const createNewPerformer = useCallback(
    async (
      performer: GQL.ScrapedPerformer,
      toCreate: GQL.PerformerCreateInput,
      remap: boolean = true
    ) => {
      try {
        const result = await createPerformer({
          variables: {
            input: toCreate,
          },
        });

        const performerID = result.data?.performerCreate?.id;
        if (performerID === undefined) return undefined;

        if (remap && performer.name !== undefined && performer.name !== null) {
          postCreateNewPerformers([{ obj: performer, id: performerID }]);
        }

        Toast.success(
          <span>
            Created performer: <b>{toCreate.name}</b>
          </span>
        );

        return performerID;
      } catch (e) {
        Toast.error(e);
      }
    },
    [Toast, createPerformer, postCreateNewPerformers]
  );

  const linkPerformer = useCallback(
    async (performer: GQL.ScrapedPerformer, performerID: string) => {
      if (
        !performer.remote_site_id ||
        !currentSource?.sourceInput.stash_box_endpoint
      )
        return;

      try {
        const queryResult = await queryFindPerformer(performerID);
        if (queryResult.data.findPerformer) {
          const target = queryResult.data.findPerformer;

          const stashIDs: GQL.StashIdInput[] = target.stash_ids.map((e) => {
            return {
              endpoint: e.endpoint,
              stash_id: e.stash_id,
            };
          });

          stashIDs.push({
            stash_id: performer.remote_site_id,
            endpoint: currentSource?.sourceInput.stash_box_endpoint,
          });

          await updatePerformer({
            variables: {
              input: {
                id: performerID,
                stash_ids: stashIDs,
              },
            },
          });

          setSearchResults((current) => {
            return mapResults(current, (r) => {
              if (!r.performers) {
                return r;
              }

              return {
                ...r,
                performers: r.performers.map((p) => {
                  if (p.remote_site_id === performer.remote_site_id) {
                    return {
                      ...p,
                      stored_id: performerID,
                    };
                  }

                  return p;
                }),
              };
            });
          });

          Toast.success(<span>Added stash-id to performer</span>);
        }
      } catch (e) {
        Toast.error(e);
      }
    },
    [Toast, currentSource?.sourceInput.stash_box_endpoint, updatePerformer]
  );

  const postCreateNewStudios = useCallback(
    (studios: CreatedObject<GQL.ScrapedStudio>[]) => {
      setSearchResults((current) => {
        return mapResults(current, (r) => {
          if (!r.studio) {
            return r;
          }

          const studio = studios.find((e) => e.obj.name === r.studio!.name);

          return {
            ...r,
            studio: studio
              ? {
                  ...r.studio,
                  stored_id: studio.id,
                }
              : r.studio,
          };
        });
      });
    },
    []
  );

  const createNewStudio = useCallback(
    async (
      studio: GQL.ScrapedStudio,
      toCreate: GQL.StudioCreateInput,
      remap?: boolean
    ) => {
      try {
        const result = await createStudio({
          variables: {
            input: toCreate,
          },
        });

        const studioID = result.data?.studioCreate?.id;
        if (studioID === undefined) return undefined;

        if (remap && studio.name !== undefined && studio.name !== null) {
          postCreateNewStudios([{ obj: studio, id: studioID }]);
        }

        Toast.success(
          <span>
            Created studio: <b>{toCreate.name}</b>
          </span>
        );

        return studioID;
      } catch (e) {
        Toast.error(e);
      }
    },
    [Toast, createStudio, postCreateNewStudios]
  );

  const updateExistingStudio = useCallback(
    async (input: GQL.StudioUpdateInput) => {
      try {
        const inputCopy = { ...input };
        inputCopy.stash_ids = await mergeStudioStashIDs(
          input.id,
          input.stash_ids ?? []
        );
        const result = await updateStudio({
          variables: {
            input: input,
          },
        });

        const studioID = result.data?.studioUpdate?.id;

        const stashID = input.stash_ids?.find((e) => {
          return e.endpoint === currentSource?.sourceInput.stash_box_endpoint;
        })?.stash_id;

        if (stashID) {
          setSearchResults((current) => {
            return mapResults(current, (r) => {
              if (!r.studio) {
                return r;
              }

              return {
                ...r,
                studio:
                  r.remote_site_id === stashID
                    ? {
                        ...r.studio,
                        stored_id: studioID,
                      }
                    : r.studio,
              };
            });
          });
        }

        Toast.success(
          <span>
            Created studio: <b>{input.name}</b>
          </span>
        );
      } catch (e) {
        Toast.error(e);
      }
    },
    [Toast, currentSource?.sourceInput.stash_box_endpoint, updateStudio]
  );

  const linkStudio = useCallback(
    async (studio: GQL.ScrapedStudio, studioID: string) => {
      if (
        !studio.remote_site_id ||
        !currentSource?.sourceInput.stash_box_endpoint
      )
        return;

      try {
        const queryResult = await queryFindStudio(studioID);
        if (queryResult.data.findStudio) {
          const target = queryResult.data.findStudio;

          const stashIDs: GQL.StashIdInput[] = target.stash_ids.map((e) => {
            return {
              endpoint: e.endpoint,
              stash_id: e.stash_id,
            };
          });

          stashIDs.push({
            stash_id: studio.remote_site_id,
            endpoint: currentSource?.sourceInput.stash_box_endpoint,
          });

          await updateStudio({
            variables: {
              input: {
                id: studioID,
                stash_ids: stashIDs,
              },
            },
          });

          setSearchResults((current) => {
            return mapResults(current, (r) => {
              if (!r.studio) {
                return r;
              }

              return {
                ...r,
                studio:
                  r.studio.remote_site_id === studio.remote_site_id
                    ? {
                        ...r.studio,
                        stored_id: studioID,
                      }
                    : r.studio,
              };
            });
          });

          Toast.success(<span>Added stash-id to studio</span>);
        }
      } catch (e) {
        Toast.error(e);
      }
    },
    [Toast, currentSource?.sourceInput.stash_box_endpoint, updateStudio]
  );

  return (
    <TaggerStateContext.Provider
      value={{
        config: config ?? initialConfig,
        setConfig,
        loading: loading || loadingMulti,
        loadingMulti,
        multiError,
        sources,
        currentSource,
        searchResults,
        setCurrentSource: (src) => {
          setCurrentSource(src);
        },
        doSceneQuery,
        doSceneFragmentScrape,
        doMultiSceneFragmentScrape,
        stopMultiScrape,
        createNewTag,
        postCreateNewTags,
        postCreateNewStudios,
        createNewPerformer,
        postCreateNewPerformers,
        linkPerformer,
        createNewStudio,
        updateStudio: updateExistingStudio,
        linkStudio,
        resolveScene,
        saveScene,
        submitFingerprints,
        pendingFingerprints: getPendingFingerprints(),
      }}
    >
      {children}
    </TaggerStateContext.Provider>
  );
};

export interface IMissingObjects {
  performers: GQL.ScrapedPerformer[];
  studios: GQL.ScrapedStudio[];
  tags: GQL.ScrapedTag[];
}

export interface ITaggerSelectContextState {
  selectedResults: Record<string, number>;
  selectResult: (sceneID: string, index: number) => void;
  missingObjects: IMissingObjects;
}

export const TaggerSelectStateContext =
  React.createContext<ITaggerSelectContextState | null>(null);

export const useTaggerSelect = () => {
  const context = React.useContext(TaggerSelectStateContext);

  if (context === null) {
    throw new Error("useTagger must be used within a TaggerSelectContext");
  }

  return context;
};

export const TaggerSelectContext: React.FC<{
  scenes: GQL.SlimSceneDataFragment[];
}> = ({ scenes, children }) => {
  const [selectedResults, setSelectedResults] = useState<
    Record<string, number>
  >({});

  const { searchResults, config } = useTagger();

  useEffect(() => {
    setSelectedResults((current) => {
      const newSelectedResults = { ...current };

      // #3198 - if the selected result is no longer in the list, reset it
      // also filter out results that are not in the scenes list
      Object.keys(current).forEach((k) => {
        if (
          !scenes.find((s) => s.id === k) ||
          (searchResults[k]?.results?.length ?? 0) <= current[k]
        ) {
          delete newSelectedResults[k];
        }
      });

      scenes.forEach((s) => {
        const k = s.id;
        if (
          newSelectedResults[k] === undefined &&
          searchResults[k]?.results?.length
        ) {
          newSelectedResults[k] = 0;
        }
      });

      return newSelectedResults;
    });
  }, [scenes, searchResults]);

  const selectResult = useCallback((sceneID: string, index: number) => {
    setSelectedResults((current) => {
      return { ...current, [sceneID]: index };
    });
  }, []);

  const missingObjects = useMemo(() => {
    function byName(name: string) {
      return (v: { name?: GQL.Maybe<string> }) => v.name === name;
    }

    function nameCompare(
      a: { name?: GQL.Maybe<string> },
      b: { name?: GQL.Maybe<string> }
    ) {
      return (a.name ?? "").localeCompare(b.name ?? "");
    }

    const performers: GQL.ScrapedPerformer[] = [];
    const studios: GQL.ScrapedStudio[] = [];
    const tags: GQL.ScrapedTag[] = [];

    Object.keys(selectedResults).forEach((result) => {
      const scene = searchResults[result]?.results?.[selectedResults[result]];
      if (!scene) return;

      scene.performers?.forEach((performer) => {
        if (!config?.showMales && performer.gender === GQL.GenderEnum.Male) {
          return;
        }

        if (
          !performer.stored_id &&
          performer.name &&
          !performers.some(byName(performer.name))
        ) {
          performers.push(performer);
        }
      });

      if (scene.studio && !scene.studio.stored_id) {
        const { name } = scene.studio;
        if (name && !studios.some(byName(name))) {
          studios.push(scene.studio);
        }
      }

      if (config?.setTags) {
        scene.tags?.forEach((tag) => {
          if (!tag.stored_id && tag.name && !tags.some(byName(tag.name))) {
            tags.push(tag);
          }
        });
      }
    });

    performers.sort(nameCompare);
    studios.sort(nameCompare);
    tags.sort(nameCompare);

    return {
      performers,
      studios,
      tags,
    };
  }, [selectedResults, searchResults, config?.showMales, config?.setTags]);

  return (
    <TaggerSelectStateContext.Provider
      value={{
        selectedResults,
        selectResult,
        missingObjects,
      }}
    >
      {children}
    </TaggerSelectStateContext.Provider>
  );
};
