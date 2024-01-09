import cloneDeep from "lodash-es/cloneDeep";
import React, {
  HTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import cx from "classnames";
import Mousetrap from "mousetrap";
import { SortDirectionEnum } from "src/core/generated-graphql";
import {
  Button,
  ButtonGroup,
  Dropdown,
  Form,
  OverlayTrigger,
  Tooltip,
  InputGroup,
  FormControl,
  Popover,
  Overlay,
} from "react-bootstrap";

import { Icon } from "../Shared/Icon";
import { ListFilterModel } from "src/models/list-filter/filter";
import useFocus from "src/utils/focus";
import {
  ISortByOption,
  ListFilterOptions,
} from "src/models/list-filter/filter-options";
import { FormattedMessage, useIntl } from "react-intl";
import { PersistanceLevel } from "./ItemList";
import { SavedFilterList } from "./SavedFilterList";
import {
  faBookmark,
  faCaretDown,
  faCaretUp,
  faCheck,
  faRandom,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FilterButton } from "./Filters/FilterButton";
import { useDebounce } from "src/hooks/debounce";

interface IListFilterProps {
  onFilterUpdate: (newFilter: ListFilterModel) => void;
  filter: ListFilterModel;
  filterOptions: ListFilterOptions;
  persistState?: PersistanceLevel;
  openFilterDialog: () => void;
}

const PAGE_SIZE_OPTIONS = ["20", "40", "60", "120", "250", "500", "1000"];

export const PageSizeSelect: React.FC<{
  pageSize: number;
  setPageSize: (size: number) => void;
}> = ({ pageSize, setPageSize }) => {
  const intl = useIntl();

  const perPageSelect = useRef(null);
  const [perPageInput, perPageFocus] = useFocus();

  const [customPageSizeShowing, setCustomPageSizeShowing] = useState(false);

  useEffect(() => {
    if (customPageSizeShowing) {
      perPageFocus();
    }
  }, [customPageSizeShowing, perPageFocus]);

  function onChangePageSize(val: string) {
    if (val === "custom") {
      // added timeout since Firefox seems to trigger the rootClose immediately
      // without it
      setTimeout(() => setCustomPageSizeShowing(true), 0);
      return;
    }

    setCustomPageSizeShowing(false);

    let pp = parseInt(val, 10);
    if (Number.isNaN(pp) || pp <= 0) {
      return;
    }

    setPageSize(pp);
  }

  const pageSizeOptions = useMemo(() => {
    let ret = PAGE_SIZE_OPTIONS.map((o) => {
      return {
        label: o,
        value: o,
      };
    });

    const currentPerPage = pageSize.toString();
    if (!ret.find((o) => o.value === currentPerPage)) {
      ret.push({ label: currentPerPage, value: currentPerPage });
      ret.sort((a, b) => parseInt(a.value, 10) - parseInt(b.value, 10));
    }

    ret.push({
      label: `${intl.formatMessage({ id: "custom" })}...`,
      value: "custom",
    });

    return ret;
  }, [intl, pageSize]);

  return (
    <div className="mb-2">
      <Form.Control
        as="select"
        ref={perPageSelect}
        onChange={(e) => onChangePageSize(e.target.value)}
        value={pageSize.toString()}
        className="btn-secondary"
      >
        {pageSizeOptions.map((s) => (
          <option value={s.value} key={s.value}>
            {s.label}
          </option>
        ))}
      </Form.Control>
      <Overlay
        target={perPageSelect.current}
        show={customPageSizeShowing}
        placement="bottom"
        rootClose
        onHide={() => setCustomPageSizeShowing(false)}
      >
        <Popover id="custom_pagesize_popover">
          <Form inline>
            <InputGroup>
              <Form.Control
                type="number"
                min={1}
                className="text-input"
                ref={perPageInput}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    onChangePageSize(
                      (perPageInput.current as HTMLInputElement)?.value ?? ""
                    );
                    e.preventDefault();
                  }
                }}
              />
              <InputGroup.Append>
                <Button
                  variant="primary"
                  onClick={() =>
                    onChangePageSize(
                      (perPageInput.current as HTMLInputElement)?.value ?? ""
                    )
                  }
                >
                  <Icon icon={faCheck} />
                </Button>
              </InputGroup.Append>
            </InputGroup>
          </Form>
        </Popover>
      </Overlay>
    </div>
  );
};

export const SortBySelect: React.FC<{
  sortBy: string | undefined;
  direction: SortDirectionEnum;
  options: ISortByOption[];
  setSortBy: (sortBy: string | null) => void;
  setDirection: (direction: SortDirectionEnum) => void;
  onReshuffleRandomSort: () => void;
}> = ({
  sortBy,
  direction: sortDirection,
  options: sortByOptions,
  setSortBy,
  setDirection,
  onReshuffleRandomSort,
}) => {
  const intl = useIntl();

  const currentSortBy = useMemo(
    () => sortByOptions.find((o) => o.value === sortBy),
    [sortByOptions, sortBy]
  );

  function renderSortByOptions() {
    return sortByOptions
      .map((o) => {
        return {
          message: intl.formatMessage({ id: o.messageID }),
          value: o.value,
        };
      })
      .sort((a, b) => a.message.localeCompare(b.message))
      .map((option) => (
        <Dropdown.Item
          onSelect={setSortBy}
          key={option.value}
          className="bg-secondary text-white"
          eventKey={option.value}
        >
          {option.message}
        </Dropdown.Item>
      ));
  }

  function onChangeSortDirection() {
    if (sortDirection === SortDirectionEnum.Asc) {
      setDirection(SortDirectionEnum.Desc);
    } else {
      setDirection(SortDirectionEnum.Asc);
    }
  }

  return (
    <Dropdown as={ButtonGroup} className="mr-2 mb-2">
      <InputGroup.Prepend>
        <Dropdown.Toggle variant="secondary">
          {currentSortBy
            ? intl.formatMessage({ id: currentSortBy.messageID })
            : ""}
        </Dropdown.Toggle>
      </InputGroup.Prepend>
      <Dropdown.Menu className="bg-secondary text-white">
        {renderSortByOptions()}
      </Dropdown.Menu>
      <OverlayTrigger
        overlay={
          <Tooltip id="sort-direction-tooltip">
            {sortDirection === SortDirectionEnum.Asc
              ? intl.formatMessage({ id: "ascending" })
              : intl.formatMessage({ id: "descending" })}
          </Tooltip>
        }
      >
        <Button variant="secondary" onClick={onChangeSortDirection}>
          <Icon
            icon={
              sortDirection === SortDirectionEnum.Asc ? faCaretUp : faCaretDown
            }
          />
        </Button>
      </OverlayTrigger>
      {sortBy === "random" && (
        <OverlayTrigger
          overlay={
            <Tooltip id="sort-reshuffle-tooltip">
              {intl.formatMessage({ id: "actions.reshuffle" })}
            </Tooltip>
          }
        >
          <Button variant="secondary" onClick={onReshuffleRandomSort}>
            <Icon icon={faRandom} />
          </Button>
        </OverlayTrigger>
      )}
    </Dropdown>
  );
};

export const ListFilter: React.FC<IListFilterProps> = ({
  onFilterUpdate,
  filter,
  filterOptions,
  openFilterDialog,
  persistState,
}) => {
  const [queryRef, setQueryFocus] = useFocus();
  const [queryClearShowing, setQueryClearShowing] = useState(
    !!filter.searchTerm
  );

  const searchQueryUpdated = useCallback(
    (value: string) => {
      const newFilter = cloneDeep(filter);
      newFilter.searchTerm = value;
      newFilter.currentPage = 1;
      onFilterUpdate(newFilter);
    },
    [filter, onFilterUpdate]
  );

  const searchCallback = useDebounce((value: string) => {
    const newFilter = cloneDeep(filter);
    newFilter.searchTerm = value;
    newFilter.currentPage = 1;
    onFilterUpdate(newFilter);
  }, 500);

  const intl = useIntl();

  useEffect(() => {
    Mousetrap.bind("/", (e) => {
      setQueryFocus();
      e.preventDefault();
    });

    Mousetrap.bind("r", () => onReshuffleRandomSort());

    return () => {
      Mousetrap.unbind("/");
      Mousetrap.unbind("r");
    };
  });

  // clear search input when filter is cleared
  useEffect(() => {
    if (!filter.searchTerm) {
      if (queryRef.current) queryRef.current.value = "";
      setQueryClearShowing(false);
    }
  }, [filter.searchTerm, queryRef]);

  function onChangePageSize(val: number) {
    const newFilter = cloneDeep(filter);
    newFilter.itemsPerPage = val;
    newFilter.currentPage = 1;
    onFilterUpdate(newFilter);
  }

  function onChangeQuery(event: React.FormEvent<HTMLInputElement>) {
    searchCallback(event.currentTarget.value);
    setQueryClearShowing(!!event.currentTarget.value);
  }

  function onClearQuery() {
    if (queryRef.current) queryRef.current.value = "";
    searchQueryUpdated("");
    setQueryFocus();
    setQueryClearShowing(false);
  }

  function onChangeSortDirection(dir: SortDirectionEnum) {
    const newFilter = cloneDeep(filter);
    newFilter.sortDirection = dir;
    onFilterUpdate(newFilter);
  }

  function onChangeSortBy(eventKey: string | null) {
    const newFilter = cloneDeep(filter);
    newFilter.sortBy = eventKey ?? undefined;
    newFilter.currentPage = 1;
    onFilterUpdate(newFilter);
  }

  function onReshuffleRandomSort() {
    const newFilter = cloneDeep(filter);
    newFilter.currentPage = 1;
    newFilter.randomSeed = -1;
    onFilterUpdate(newFilter);
  }

  const SavedFilterDropdown = React.forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
  >(({ style, className }: HTMLAttributes<HTMLDivElement>, ref) => (
    <div ref={ref} style={style} className={className}>
      <SavedFilterList
        filter={filter}
        onSetFilter={(f) => {
          onFilterUpdate(f);
        }}
        persistState={persistState}
      />
    </div>
  ));
  SavedFilterDropdown.displayName = "SavedFilterDropdown";

  function render() {
    return (
      <>
        <div className="mb-2 mr-2 d-flex">
          <div className="flex-grow-1 query-text-field-group">
            <FormControl
              ref={queryRef}
              placeholder={`${intl.formatMessage({ id: "actions.search" })}…`}
              defaultValue={filter.searchTerm}
              onInput={onChangeQuery}
              className="query-text-field bg-secondary text-white border-secondary"
            />
            <Button
              variant="secondary"
              onClick={onClearQuery}
              title={intl.formatMessage({ id: "actions.clear" })}
              className={cx(
                "query-text-field-clear",
                queryClearShowing ? "" : "d-none"
              )}
            >
              <Icon icon={faTimes} />
            </Button>
          </div>
        </div>

        <ButtonGroup className="mr-2 mb-2">
          <Dropdown>
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip id="filter-tooltip">
                  <FormattedMessage id="search_filter.saved_filters" />
                </Tooltip>
              }
            >
              <Dropdown.Toggle variant="secondary">
                <Icon icon={faBookmark} />
              </Dropdown.Toggle>
            </OverlayTrigger>
            <Dropdown.Menu
              as={SavedFilterDropdown}
              className="saved-filter-list-menu"
            />
          </Dropdown>
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id="filter-tooltip">
                <FormattedMessage id="search_filter.name" />
              </Tooltip>
            }
          >
            <FilterButton onClick={() => openFilterDialog()} filter={filter} />
          </OverlayTrigger>
        </ButtonGroup>

        <SortBySelect
          sortBy={filter.sortBy}
          direction={filter.sortDirection}
          options={filterOptions.sortByOptions}
          setSortBy={onChangeSortBy}
          setDirection={onChangeSortDirection}
          onReshuffleRandomSort={onReshuffleRandomSort}
        />

        <PageSizeSelect
          pageSize={filter.itemsPerPage}
          setPageSize={(size) => onChangePageSize(size)}
        />
      </>
    );
  }

  return render();
};
