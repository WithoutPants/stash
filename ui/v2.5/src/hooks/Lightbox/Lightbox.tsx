import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  Col,
  InputGroup,
  Overlay,
  Popover,
  Form,
  Row,
  Dropdown,
} from "react-bootstrap";
import cx from "classnames";
import Mousetrap from "mousetrap";

import { Icon } from "src/components/Shared/Icon";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import useInterval from "../Interval";
import usePageVisibility from "../PageVisibility";
import { useToast } from "../Toast";
import { FormattedMessage, useIntl } from "react-intl";
import { LightboxImage } from "./LightboxImage";
import { ConfigurationContext } from "../Config";
import { Link } from "react-router-dom";
import { OCounterButton } from "src/components/Scenes/SceneDetails/OCounterButton";
import {
  mutateImageIncrementO,
  mutateImageDecrementO,
  mutateImageResetO,
  useImageUpdate,
} from "src/core/StashService";
import * as GQL from "src/core/generated-graphql";
import { useInterfaceLocalForage } from "../LocalForage";
import { imageLightboxDisplayModeIntlMap } from "src/core/enums";
import { ILightboxImage, IChapter } from "./types";
import {
  faArrowLeft,
  faArrowRight,
  faChevronLeft,
  faChevronRight,
  faCog,
  faExpand,
  faPause,
  faPlay,
  faSearchMinus,
  faTimes,
  faBars,
} from "@fortawesome/free-solid-svg-icons";
import { RatingSystem } from "src/components/Shared/Rating/RatingSystem";
import { useDebounce } from "../debounce";
import { isVideo } from "src/utils/visualFile";

const CLASSNAME = "Lightbox";
const CLASSNAME_HEADER = `${CLASSNAME}-header`;
const CLASSNAME_LEFT_SPACER = `${CLASSNAME_HEADER}-left-spacer`;
const CLASSNAME_CHAPTERS = `${CLASSNAME_HEADER}-chapters`;
const CLASSNAME_CHAPTER_BUTTON = `${CLASSNAME_HEADER}-chapter-button`;
const CLASSNAME_INDICATOR = `${CLASSNAME_HEADER}-indicator`;
const CLASSNAME_OPTIONS = `${CLASSNAME_HEADER}-options`;
const CLASSNAME_OPTIONS_ICON = `${CLASSNAME_OPTIONS}-icon`;
const CLASSNAME_OPTIONS_INLINE = `${CLASSNAME_OPTIONS}-inline`;
const CLASSNAME_RIGHT = `${CLASSNAME_HEADER}-right`;
const CLASSNAME_FOOTER = `${CLASSNAME}-footer`;
const CLASSNAME_FOOTER_LEFT = `${CLASSNAME_FOOTER}-left`;
const CLASSNAME_DISPLAY = `${CLASSNAME}-display`;
const CLASSNAME_CAROUSEL = `${CLASSNAME}-carousel`;
const CLASSNAME_INSTANT = `${CLASSNAME_CAROUSEL}-instant`;
const CLASSNAME_IMAGE = `${CLASSNAME_CAROUSEL}-image`;
const CLASSNAME_NAVBUTTON = `${CLASSNAME}-navbutton`;
const CLASSNAME_NAV = `${CLASSNAME}-nav`;
const CLASSNAME_NAVIMAGE = `${CLASSNAME_NAV}-image`;
const CLASSNAME_NAVSELECTED = `${CLASSNAME_NAV}-selected`;

const DEFAULT_SLIDESHOW_DELAY = 5000;
const SECONDS_TO_MS = 1000;
const MIN_VALID_INTERVAL_SECONDS = 1;
const MIN_ZOOM = 0.1;
const SCROLL_ZOOM_TIMEOUT = 250;
const ZOOM_NONE_EPSILON = 0.015;

interface ILightboxSettings {
  showChapters: boolean;
  slideshowEnabled: boolean;
  slideshowActive: boolean;
  zoom: number;
}

interface IOptionsFormProps {
  slideshowEnabled: boolean;
  slideshowDelay: number;
  lightboxConfig?: GQL.ConfigImageLightboxInput;
  setLightboxConfig(v: Partial<GQL.ConfigImageLightboxInput>): void;
}

const OptionsForm: React.FC<IOptionsFormProps> = ({
  slideshowEnabled,
  slideshowDelay,
  lightboxConfig,
  setLightboxConfig,
}) => {
  const displayMode =
    lightboxConfig?.displayMode ?? GQL.ImageLightboxDisplayMode.FitXy;

  const intl = useIntl();

  const onDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Without this exception, the blocking of updates for invalid values is even weirder
    if (e.currentTarget.value === "-" || e.currentTarget.value === "") {
      return;
    }

    let numberValue = Number.parseInt(e.currentTarget.value, 10);

    numberValue =
      numberValue >= MIN_VALID_INTERVAL_SECONDS
        ? numberValue
        : MIN_VALID_INTERVAL_SECONDS;

    setLightboxConfig({ slideshowDelay: numberValue });
  };

  function setScaleUp(value: boolean) {
    setLightboxConfig({ scaleUp: value });
  }

  function setResetZoomOnNav(v: boolean) {
    setLightboxConfig({ resetZoomOnNav: v });
  }

  function setScrollMode(v: GQL.ImageLightboxScrollMode) {
    setLightboxConfig({ scrollMode: v });
  }

  return (
    <>
      {slideshowEnabled ? (
        <Form.Group controlId="delay" as={Row} className="form-container">
          <Col xs={4}>
            <Form.Label className="col-form-label">
              <FormattedMessage id="dialogs.lightbox.delay" />
            </Form.Label>
          </Col>
          <Col xs={8}>
            <Form.Control
              type="number"
              className="text-input"
              min={1}
              value={slideshowDelay}
              onChange={onDelayChange}
              size="sm"
            />
          </Col>
        </Form.Group>
      ) : undefined}

      <Form.Group controlId="displayMode" as={Row}>
        <Col xs={4}>
          <Form.Label className="col-form-label">
            <FormattedMessage id="dialogs.lightbox.display_mode.label" />
          </Form.Label>
        </Col>
        <Col xs={8}>
          <Form.Control
            as="select"
            onChange={(e) =>
              setLightboxConfig({
                displayMode: e.target.value as GQL.ImageLightboxDisplayMode,
              })
            }
            value={displayMode}
            className="btn-secondary mx-1 mb-1"
          >
            {Array.from(imageLightboxDisplayModeIntlMap.entries()).map((v) => (
              <option key={v[0]} value={v[0]}>
                {intl.formatMessage({
                  id: v[1],
                })}
              </option>
            ))}
          </Form.Control>
        </Col>
      </Form.Group>
      <Form.Group>
        <Form.Group controlId="scaleUp" as={Row} className="mb-1">
          <Col>
            <Form.Check
              type="checkbox"
              label={intl.formatMessage({
                id: "dialogs.lightbox.scale_up.label",
              })}
              checked={lightboxConfig?.scaleUp ?? false}
              disabled={
                lightboxConfig?.displayMode ===
                GQL.ImageLightboxDisplayMode.Original
              }
              onChange={(v) => setScaleUp(v.currentTarget.checked)}
            />
          </Col>
        </Form.Group>
        <Form.Text className="text-muted">
          {intl.formatMessage({
            id: "dialogs.lightbox.scale_up.description",
          })}
        </Form.Text>
      </Form.Group>
      <Form.Group>
        <Form.Group controlId="resetZoomOnNav" as={Row} className="mb-1">
          <Col>
            <Form.Check
              type="checkbox"
              label={intl.formatMessage({
                id: "dialogs.lightbox.reset_zoom_on_nav",
              })}
              checked={lightboxConfig?.resetZoomOnNav ?? false}
              onChange={(v) => setResetZoomOnNav(v.currentTarget.checked)}
            />
          </Col>
        </Form.Group>
      </Form.Group>
      <Form.Group controlId="scrollMode">
        <Form.Group as={Row} className="mb-1">
          <Col xs={4}>
            <Form.Label className="col-form-label">
              <FormattedMessage id="dialogs.lightbox.scroll_mode.label" />
            </Form.Label>
          </Col>
          <Col xs={8}>
            <Form.Control
              as="select"
              onChange={(e) =>
                setScrollMode(e.target.value as GQL.ImageLightboxScrollMode)
              }
              value={
                lightboxConfig?.scrollMode ?? GQL.ImageLightboxScrollMode.Zoom
              }
              className="btn-secondary mx-1 mb-1"
            >
              <option
                value={GQL.ImageLightboxScrollMode.Zoom}
                key={GQL.ImageLightboxScrollMode.Zoom}
              >
                {intl.formatMessage({
                  id: "dialogs.lightbox.scroll_mode.zoom",
                })}
              </option>
              <option
                value={GQL.ImageLightboxScrollMode.PanY}
                key={GQL.ImageLightboxScrollMode.PanY}
              >
                {intl.formatMessage({
                  id: "dialogs.lightbox.scroll_mode.pan_y",
                })}
              </option>
            </Form.Control>
          </Col>
        </Form.Group>
        <Form.Text className="text-muted">
          {intl.formatMessage({
            id: "dialogs.lightbox.scroll_mode.description",
          })}
        </Form.Text>
      </Form.Group>
    </>
  );
};

interface IHeaderProps {
  index: number;
  total: number;
  page?: number;
  totalPages?: number;
  chapters: IChapter[];
  chapter?: IChapter;

  slideshowDelay: number;
  settings: ILightboxSettings;
  setSettings: (v: ILightboxSettings) => void;

  lightboxConfig?: GQL.ConfigImageLightboxInput;
  setLightboxConfig(v: Partial<GQL.ConfigImageLightboxInput>): void;

  containerRef: React.MutableRefObject<HTMLDivElement | null>;

  gotoImage: (imageIndex: number) => void;
  onResetZoom: () => void;
  toggleFullscreen: () => void;
  onClose: () => void;
}

const Header: React.FC<IHeaderProps> = ({
  total,
  totalPages = 0,
  slideshowDelay,
  settings,
  setSettings,
  lightboxConfig,
  setLightboxConfig,
  containerRef,
  onResetZoom,
  toggleFullscreen,

  chapters,
  chapter,
  index,
  page,
  gotoImage,
  onClose,
}) => {
  const [showOptions, setShowOptions] = useState(false);

  const { showChapters, slideshowEnabled, slideshowActive, zoom } = settings;

  const intl = useIntl();

  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const overlayTarget = useRef<HTMLButtonElement | null>(null);

  function changeSetting(v: Partial<ILightboxSettings>) {
    setSettings({ ...settings, ...v });
  }

  const toggleSlideshow = useCallback(() => {
    setSettings({ ...settings, slideshowActive: !slideshowActive });
  }, [slideshowActive, settings, setSettings]);

  const chapterTitle = chapter?.title ?? "";

  const renderChapterMenu = () => {
    if (chapters.length <= 0) return;

    const popoverContent = chapters.map(({ id, title, image_index }) => (
      <Dropdown.Item key={id} onClick={() => gotoImage(image_index)}>
        {" "}
        {title}
        {title.length > 0 ? " - #" : "#"}
        {image_index}
      </Dropdown.Item>
    ));

    return (
      <Dropdown
        show={showChapters}
        onToggle={() => changeSetting({ showChapters: !showChapters })}
      >
        <Dropdown.Toggle className={`minimal ${CLASSNAME_CHAPTER_BUTTON}`}>
          <Icon icon={showChapters ? faTimes : faBars} />
        </Dropdown.Toggle>
        <Dropdown.Menu className={`${CLASSNAME_CHAPTERS}`}>
          {popoverContent}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const pageHeader =
    page && totalPages
      ? intl.formatMessage(
          { id: "dialogs.lightbox.page_header" },
          { page, total: totalPages }
        )
      : "";

  const optionsForm = useMemo(
    () => (
      <OptionsForm
        slideshowEnabled={settings.slideshowEnabled}
        slideshowDelay={slideshowDelay}
        setLightboxConfig={setLightboxConfig}
        lightboxConfig={lightboxConfig}
      />
    ),
    [settings, setLightboxConfig, lightboxConfig, slideshowDelay]
  );

  return (
    <div className={CLASSNAME_HEADER}>
      <div className={CLASSNAME_LEFT_SPACER}>{renderChapterMenu()}</div>
      <div className={CLASSNAME_INDICATOR}>
        <span>
          {chapterTitle} {pageHeader}
        </span>
        {total > 1 ? (
          <b ref={indicatorRef}>{`${index + 1} / ${total}`}</b>
        ) : undefined}
      </div>
      <div className={CLASSNAME_RIGHT}>
        <div className={CLASSNAME_OPTIONS}>
          <div className={CLASSNAME_OPTIONS_ICON}>
            <Button
              ref={overlayTarget}
              variant="link"
              title={intl.formatMessage({
                id: "dialogs.lightbox.options",
              })}
              onClick={() => setShowOptions(!showOptions)}
            >
              <Icon icon={faCog} />
            </Button>
            <Overlay
              target={overlayTarget.current}
              show={showOptions}
              placement="bottom"
              container={containerRef}
              rootClose
              onHide={() => setShowOptions(false)}
            >
              {({ placement, arrowProps, show: _show, ...props }) => (
                <div className="popover" {...props} style={{ ...props.style }}>
                  <Popover.Title>
                    {intl.formatMessage({
                      id: "dialogs.lightbox.options",
                    })}
                  </Popover.Title>
                  <Popover.Content>{optionsForm}</Popover.Content>
                </div>
              )}
            </Overlay>
          </div>
          <InputGroup className={CLASSNAME_OPTIONS_INLINE}>
            {optionsForm}
          </InputGroup>
        </div>
        {slideshowEnabled && (
          <Button
            variant="link"
            onClick={toggleSlideshow}
            title="Toggle Slideshow"
          >
            <Icon icon={slideshowActive ? faPause : faPlay} />
          </Button>
        )}
        {zoom !== 1 && (
          <Button
            variant="link"
            onClick={() => onResetZoom()}
            title="Reset zoom"
          >
            <Icon icon={faSearchMinus} />
          </Button>
        )}
        {document.fullscreenEnabled && (
          <Button
            variant="link"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            <Icon icon={faExpand} />
          </Button>
        )}
        <Button variant="link" onClick={() => onClose()} title="Close Lightbox">
          <Icon icon={faTimes} />
        </Button>
      </div>
    </div>
  );
};

interface IFooterProps {
  currentImage: ILightboxImage | undefined;
}

const Footer: React.FC<IFooterProps> = ({ currentImage }) => {
  const Toast = useToast();
  const [updateImage] = useImageUpdate();

  function setRating(v: number | null) {
    if (currentImage?.id) {
      updateImage({
        variables: {
          input: {
            id: currentImage.id,
            rating100: v,
          },
        },
      });
    }
  }

  async function onIncrementClick() {
    if (currentImage?.id === undefined) return;
    try {
      await mutateImageIncrementO(currentImage.id);
    } catch (e) {
      Toast.error(e);
    }
  }

  async function onDecrementClick() {
    if (currentImage?.id === undefined) return;
    try {
      await mutateImageDecrementO(currentImage.id);
    } catch (e) {
      Toast.error(e);
    }
  }

  async function onResetClick() {
    if (currentImage?.id === undefined) return;
    try {
      await mutateImageResetO(currentImage?.id);
    } catch (e) {
      Toast.error(e);
    }
  }

  return (
    <div className={CLASSNAME_FOOTER}>
      <div className={CLASSNAME_FOOTER_LEFT}>
        {currentImage?.id !== undefined && (
          <>
            <div>
              <OCounterButton
                onDecrement={onDecrementClick}
                onIncrement={onIncrementClick}
                onReset={onResetClick}
                value={currentImage?.o_counter ?? 0}
              />
            </div>
            <RatingSystem
              value={currentImage?.rating100 ?? undefined}
              onSetRating={(v) => {
                setRating(v ?? null);
              }}
            />
          </>
        )}
      </div>
      <div>
        {currentImage?.title && (
          <Link to={`/images/${currentImage.id}`} onClick={() => close()}>
            {currentImage.title ?? ""}
          </Link>
        )}
      </div>
      <div></div>
    </div>
  );
};

interface IProps {
  images: ILightboxImage[];
  isVisible: boolean;
  isLoading: boolean;
  initialIndex?: number;
  showNavigation: boolean;
  slideshowEnabled?: boolean;
  page?: number;
  pages?: number;
  pageSize?: number;
  pageCallback?: (props: { direction?: number; page?: number }) => void;
  chapters?: IChapter[];
  hide: () => void;
}

export const LightboxComponent: React.FC<IProps> = ({
  images,
  isVisible,
  isLoading,
  initialIndex = 0,
  showNavigation,
  slideshowEnabled = false,
  page,
  pages,
  pageSize: pageSize = 40,
  pageCallback,
  chapters = [],
  hide,
}) => {
  // zero-based
  const [index, setIndex] = useState<number | null>(null);
  const [movingLeft, setMovingLeft] = useState(false);
  const oldIndex = useRef<number | null>(null);
  const [instantTransition, setInstantTransition] = useState(false);
  const [isSwitchingPage, setIsSwitchingPage] = useState(true);
  const [isFullscreen, setFullscreen] = useState(false);

  const [settings, setSettings] = useState<ILightboxSettings>({
    showChapters: false,
    slideshowEnabled,
    slideshowActive: false,
    zoom: 1,
  });

  const setShowChapters = useCallback(
    (v: boolean) => {
      setSettings((current) => ({ ...current, showChapters: v }));
    },
    [setSettings]
  );

  const setZoom = useCallback(
    (v: number) => {
      setSettings((current) => ({ ...current, zoom: v }));
    },
    [setSettings]
  );

  function stopSlideshow() {
    setSettings({ ...settings, slideshowActive: false });
  }

  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [navOffset, setNavOffset] = useState<React.CSSProperties | undefined>();

  const oldImages = useRef<ILightboxImage[]>([]);

  function updateZoom(v: number) {
    if (v < MIN_ZOOM) {
      setZoom(MIN_ZOOM);
    } else if (Math.abs(v - 1) < ZOOM_NONE_EPSILON) {
      // "snap to 1" effect: if new zoom is close to 1, set to 1
      setZoom(1);
    } else {
      setZoom(v);
    }
  }

  const [resetPosition, setResetPosition] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const navRef = useRef<HTMLDivElement | null>(null);
  const clearIntervalCallback = useRef<() => void>();
  const resetIntervalCallback = useRef<() => void>();

  const allowNavigation = images.length > 1 || pageCallback;

  const { configuration: config } = React.useContext(ConfigurationContext);
  const [interfaceLocalForage, setInterfaceLocalForage] =
    useInterfaceLocalForage();

  const lightboxConfig = interfaceLocalForage.data?.imageLightbox;

  function setLightboxConfig(v: Partial<GQL.ConfigImageLightboxInput>) {
    setInterfaceLocalForage((prev) => {
      return {
        ...prev,
        imageLightbox: {
          ...prev.imageLightbox,
          ...v,
        },
      };
    });
  }

  const configuredDelay = config?.interface.imageLightbox.slideshowDelay
    ? config.interface.imageLightbox.slideshowDelay
    : undefined;

  const savedDelay = lightboxConfig?.slideshowDelay
    ? lightboxConfig.slideshowDelay
    : undefined;

  const slideshowDelay =
    savedDelay ?? configuredDelay ?? DEFAULT_SLIDESHOW_DELAY;

  const scrollAttemptsBeforeChange = Math.max(
    0,
    config?.interface.imageLightbox.scrollAttemptsBeforeChange ?? 0
  );

  const displayMode =
    lightboxConfig?.displayMode ?? GQL.ImageLightboxDisplayMode.FitXy;
  const oldDisplayMode = useRef(displayMode);

  useEffect(() => {
    if (images !== oldImages.current && isSwitchingPage) {
      if (index === -1) setIndex(images.length - 1);
      setIsSwitchingPage(false);
    }
  }, [isSwitchingPage, images, index]);

  const disableInstantTransition = useDebounce(
    () => setInstantTransition(false),
    400
  );

  const setInstant = useCallback(() => {
    setInstantTransition(true);
    disableInstantTransition();
  }, [disableInstantTransition]);

  useEffect(() => {
    if (images.length < 2) return;
    if (index === oldIndex.current) return;
    if (index === null) return;

    if (lightboxConfig?.resetZoomOnNav) {
      setZoom(1);
    }
    setResetPosition((r) => !r);

    oldIndex.current = index;
  }, [index, images.length, setZoom, lightboxConfig?.resetZoomOnNav]);

  const getNavOffset = useCallback(() => {
    if (images.length < 2) return;
    if (index === undefined || index === null) return;

    if (navRef.current) {
      const currentThumb = navRef.current.children[index + 1];
      if (currentThumb instanceof HTMLImageElement) {
        const offset =
          -1 *
          (currentThumb.offsetLeft - document.documentElement.clientWidth / 2);

        return { left: `${offset}px` };
      }
    }
  }, [index, images.length]);

  useEffect(() => {
    // reset images loaded counter for new images
    setImagesLoaded(0);
  }, [images]);

  useEffect(() => {
    setNavOffset(getNavOffset() ?? undefined);
  }, [getNavOffset]);

  useEffect(() => {
    if (displayMode !== oldDisplayMode.current) {
      if (lightboxConfig?.resetZoomOnNav) {
        setZoom(1);
      }
      setResetPosition((r) => !r);
    }
    oldDisplayMode.current = displayMode;
  }, [displayMode, setZoom, lightboxConfig?.resetZoomOnNav]);

  const selectIndex = (e: React.MouseEvent, i: number) => {
    setIndex(i);
    e.stopPropagation();
  };

  useEffect(() => {
    if (isVisible) {
      if (index === null) setIndex(initialIndex);
      document.body.style.overflow = "hidden";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Mousetrap as any).pause();
    }
  }, [initialIndex, isVisible, setIndex, index]);

  // stop slideshow when the page is hidden
  usePageVisibility((hidden: boolean) => {
    if (hidden) {
      stopSlideshow();
    }
  });

  const close = useCallback(() => {
    if (!isFullscreen) {
      hide();
      document.body.style.overflow = "auto";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Mousetrap as any).unpause();
    } else document.exitFullscreen();
  }, [isFullscreen, hide]);

  const handleClose = (e: React.MouseEvent<HTMLDivElement>) => {
    const { className } = e.target as Element;
    if (className && className.includes && className.includes(CLASSNAME_IMAGE))
      close();
  };

  const handleLeft = useCallback(
    (isUserAction = true) => {
      if (isSwitchingPage || index === -1) return;

      setShowChapters(false);
      setMovingLeft(true);

      if (index === 0) {
        // go to next page, or loop back if no callback is set
        if (pageCallback) {
          pageCallback({ direction: -1 });
          setIndex(-1);
          oldImages.current = images;
          setIsSwitchingPage(true);
        } else setIndex(images.length - 1);
      } else setIndex((index ?? 0) - 1);

      if (isUserAction && resetIntervalCallback.current) {
        resetIntervalCallback.current();
      }
    },
    [
      images,
      pageCallback,
      isSwitchingPage,
      resetIntervalCallback,
      index,
      setShowChapters,
    ]
  );

  const handleRight = useCallback(
    (isUserAction = true) => {
      if (isSwitchingPage) return;

      setMovingLeft(false);
      setShowChapters(false);

      if (index === images.length - 1) {
        // go to preview page, or loop back if no callback is set
        if (pageCallback) {
          pageCallback({ direction: 1 });
          oldImages.current = images;
          setIsSwitchingPage(true);
          setIndex(0);
        } else setIndex(0);
      } else setIndex((index ?? 0) + 1);

      if (isUserAction && resetIntervalCallback.current) {
        resetIntervalCallback.current();
      }
    },
    [
      images,
      setIndex,
      pageCallback,
      isSwitchingPage,
      resetIntervalCallback,
      index,
      setShowChapters,
    ]
  );

  const firstScroll = useRef<number | null>(null);
  const inScrollGroup = useRef(false);

  const debouncedScrollReset = useDebounce(() => {
    firstScroll.current = null;
    inScrollGroup.current = false;
  }, SCROLL_ZOOM_TIMEOUT);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.repeat && (e.key === "ArrowRight" || e.key === "ArrowLeft"))
        setInstant();
      if (e.key === "ArrowLeft") handleLeft();
      else if (e.key === "ArrowRight") handleRight();
      else if (e.key === "Escape") close();
    },
    [setInstant, handleLeft, handleRight, close]
  );
  const handleFullScreenChange = () => {
    if (clearIntervalCallback.current) {
      clearIntervalCallback.current();
    }
    setFullscreen(document.fullscreenElement !== null);
  };

  const [clearCallback, resetCallback] = useInterval(
    () => {
      handleRight(false);
    },
    settings.slideshowActive ? slideshowDelay * SECONDS_TO_MS : null
  );

  resetIntervalCallback.current = resetCallback;
  clearIntervalCallback.current = clearCallback;

  useEffect(() => {
    if (isVisible) {
      document.addEventListener("keydown", handleKey);
      document.addEventListener("fullscreenchange", handleFullScreenChange);
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, [isVisible, handleKey]);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }, [isFullscreen]);

  function imageLoaded() {
    setImagesLoaded((loaded) => loaded + 1);

    if (imagesLoaded === images.length - 1) {
      // all images are loaded - update the nav offset
      setNavOffset(getNavOffset() ?? undefined);
    }
  }

  const navItems = images.map((image, i) =>
    React.createElement(image.paths.preview != "" ? "video" : "img", {
      loop: image.paths.preview != "",
      autoPlay: image.paths.preview != "",
      src:
        image.paths.preview != ""
          ? image.paths.preview ?? ""
          : image.paths.thumbnail ?? "",
      alt: "",
      className: cx(CLASSNAME_NAVIMAGE, {
        [CLASSNAME_NAVSELECTED]: i === index,
      }),
      onClick: (e: React.MouseEvent) => selectIndex(e, i),
      role: "presentation",
      loading: "lazy",
      key: image.paths.thumbnail,
      onLoad: imageLoaded,
    })
  );

  const currentIndex = index === null ? initialIndex : index;

  const currentChapter = useMemo(() => {
    const imageNumber = (index ?? 0) + 1;
    const globalIndex = page
      ? (page - 1) * pageSize + imageNumber
      : imageNumber;

    return chapters.find((chapter) => chapter.image_index > globalIndex);
  }, [index, page, pageSize, chapters]);

  function gotoPage(imageIndex: number) {
    const indexInPage = (imageIndex - 1) % pageSize;
    if (pageCallback) {
      let jumppage = Math.floor((imageIndex - 1) / pageSize) + 1;
      if (page !== jumppage) {
        pageCallback({ page: jumppage });
        oldImages.current = images;
        setIsSwitchingPage(true);
      }
    }

    setIndex(indexInPage);
    setShowChapters(false);
  }

  function renderBody() {
    if (images.length === 0 || isLoading || isSwitchingPage) {
      return <LoadingIndicator />;
    }

    const currentImage: ILightboxImage | undefined = images[currentIndex];

    return (
      <>
        <Header
          index={currentIndex}
          total={images.length}
          page={page}
          totalPages={pages}
          chapters={chapters}
          chapter={currentChapter}
          slideshowDelay={slideshowDelay}
          lightboxConfig={lightboxConfig}
          setLightboxConfig={setLightboxConfig}
          containerRef={containerRef}
          gotoImage={gotoPage}
          onResetZoom={() => setZoom(1)}
          toggleFullscreen={toggleFullscreen}
          settings={settings}
          setSettings={setSettings}
          onClose={() => close()}
        />
        <div className={CLASSNAME_DISPLAY}>
          {allowNavigation && (
            <Button
              variant="link"
              onClick={handleLeft}
              className={`${CLASSNAME_NAVBUTTON} d-none d-lg-block`}
            >
              <Icon icon={faChevronLeft} />
            </Button>
          )}

          <div
            className={cx(CLASSNAME_CAROUSEL, {
              [CLASSNAME_INSTANT]: instantTransition,
            })}
            style={{ left: `${currentIndex * -100}vw` }}
            ref={carouselRef}
          >
            {images.map((image, i) => (
              <div className={`${CLASSNAME_IMAGE}`} key={image.paths.image}>
                {i >= currentIndex - 1 && i <= currentIndex + 1 ? (
                  <LightboxImage
                    src={image.paths.image ?? ""}
                    displayMode={displayMode}
                    scaleUp={lightboxConfig?.scaleUp ?? false}
                    scrollMode={
                      lightboxConfig?.scrollMode ??
                      GQL.ImageLightboxScrollMode.Zoom
                    }
                    resetPosition={resetPosition}
                    zoom={i === currentIndex ? settings.zoom : 1}
                    scrollAttemptsBeforeChange={scrollAttemptsBeforeChange}
                    firstScroll={firstScroll}
                    inScrollGroup={inScrollGroup}
                    current={i === currentIndex}
                    alignBottom={movingLeft}
                    setZoom={updateZoom}
                    debouncedScrollReset={debouncedScrollReset}
                    onLeft={handleLeft}
                    onRight={handleRight}
                    isVideo={isVideo(image.visual_files?.[0] ?? {})}
                  />
                ) : undefined}
              </div>
            ))}
          </div>

          {allowNavigation && (
            <Button
              variant="link"
              onClick={handleRight}
              className={`${CLASSNAME_NAVBUTTON} d-none d-lg-block`}
            >
              <Icon icon={faChevronRight} />
            </Button>
          )}
        </div>
        {showNavigation && !isFullscreen && images.length > 1 && (
          <div className={CLASSNAME_NAV} style={navOffset} ref={navRef}>
            <Button
              variant="link"
              onClick={() => setIndex(images.length - 1)}
              className={CLASSNAME_NAVBUTTON}
            >
              <Icon icon={faArrowLeft} className="mr-4" />
            </Button>
            {navItems}
            <Button
              variant="link"
              onClick={() => setIndex(0)}
              className={CLASSNAME_NAVBUTTON}
            >
              <Icon icon={faArrowRight} className="ml-4" />
            </Button>
          </div>
        )}
        <Footer currentImage={currentImage} />
      </>
    );
  }

  if (!isVisible) {
    return <></>;
  }

  return (
    <div
      className={CLASSNAME}
      role="presentation"
      ref={containerRef}
      onClick={handleClose}
    >
      {renderBody()}
    </div>
  );
};

export default LightboxComponent;
