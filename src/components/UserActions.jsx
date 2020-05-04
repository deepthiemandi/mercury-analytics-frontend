import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './UserActions.module.css';
import { getClients } from '../store/clients/actions';
import {
  getUsers,
  createUser,
  deleteUser,
  getAuthorizedUsers,
  authorizeUser,
  getUserAuthorizations,
} from '../store/users/actions';
import { useForm, useField } from 'react-final-form-hooks';
import Loader from './Loader';
import Search from './Search';
import { MdPlayArrow } from 'react-icons/md';
import { Bin, Menu } from './Icons';
import Toggle from './Toggle';
import Modal from './Modal';
import Button from './Button';
import Scrollable from './Scrollable';
import { Input } from './FormFields';

export const UserActionsContexts = {
  Client: 'client',
  Project: 'project',
  Report: 'report',
};

export const UserActionsModes = {
  Grant: 'grant',
  Manage: 'manage',
};

const UserActions = props => {
  const { mode, context, clientId, projectId, reportId, selectedUserId, limitClientId } = props;
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [authorizedOptions, setAuthorizedOptions] = useState(null);
  const [openClients, setOpenClients] = useState({});
  const [loadedClients, setLoadedClients] = useState({});
  const [allowedClients, setAllowedClients] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeStates, setActiveStates] = useState({});
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleteBusy, setIsDeleteBusy] = useState({});
  const clients = useSelector(state => state.clientsReducer.clients);
  const users = useSelector(state => state.usersReducer.users);
  const authorizedUsers = useSelector(state => state.usersReducer.authorizedUsers);
  const [userNameFilter, setUserNameFilter] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedClients, setBlockedClients] = useState([]);
  const [openClientsBackup, setOpenClientsBackup] = useState(null);

  const handleItemSelect = useCallback((id) => {
    if (mode === UserActionsModes.Manage) {
      setSelectedItem(id);
      if (props.onUserSelect) {
        props.onUserSelect(id);
      }
    }
  }, [mode, props.onUserSelect, selectedUserId]);

  const handleClientToggle = useCallback(async (id, forced) => {
    const status = forced ? !forced : !!openClients[id];
    setOpenClients(prev => ({ ...prev, [id]: !status }));
    if (!loadedClients[id]) {
      await Promise.all([
        dispatch(getUsers(id)).then(() => {}, () => {}),
        dispatch(getAuthorizedUsers(id, authorizedOptions)).then(() => {}, () => {}),
      ]).then(() => {
        setLoadedClients(prev => ({ ...prev, [id]: true }));
      });
    }
  }, [mode, openClients, loadedClients, authorizedOptions]);

  useEffect(() => {
    if (clientId || projectId || reportId) {
      let options = {};
      if (projectId) {
        options.projectId = projectId;
      } else if (reportId) {
        options.reportId = reportId;
      } else {
        options.clientId = clientId;
      }
      setAuthorizedOptions(options);
    }
  }, [clientId, projectId, reportId]);

  const init = useCallback(async () => {
    const clientLimit = clientId ? clientId : (limitClientId ? limitClientId : null);
    setAllowedClients(clientLimit ? [clientLimit] : []);
    let promises = [
      dispatch(getClients()).then(() => {}, () => {}),
      dispatch(getUsers(clientLimit)).then(() => {}, () => {}),
    ];
    if (mode === UserActionsModes.Grant) {
      promises.push(dispatch(getAuthorizedUsers(clientId, authorizedOptions)).then(() => {}, () => {}));
    }
    await Promise.all(promises).then(() => {
      if (mode === UserActionsModes.Grant && clientId) {
        handleClientToggle(clientId, true);
      }
    });
  }, [mode, clientId, limitClientId, authorizedOptions]);

  useEffect(() => {
    setIsLoading(true);
    setOpenClients({});
    if (mode && (authorizedOptions || !clientId)) {
      init().then(() => setIsLoading(false));
    }
  }, [mode, clientId, authorizedOptions]);

  useEffect(() => {
    if (!isLoading && (mode === UserActionsModes.Grant || !limitClientId)) {
      let allowedIds = {};
      users.forEach(u => u.client_ids.forEach(cid => (allowedIds[cid] = true)));
      setAllowedClients(Object.keys(allowedIds).map(id => +id));
    }
  }, [isLoading, users, mode, limitClientId]);

  const ensureSelectedItem = useCallback((id) => {
    if (id === false && selectedItem !== false) {
      handleItemSelect(false);
      return;
    }
    if (id === true || id !== selectedItem || !selectedItem) {
      const clientLimit = clientId ? clientId : (limitClientId ? limitClientId : null);
      let toSelect = null;
      if (typeof id !== 'undefined') {
        toSelect = id || null;
      }
      const u = (toSelect ?
        users.filter(u => u.id === toSelect)
        : (clientLimit ? users.filter(u => u.client_ids.indexOf(clientLimit) > -1) : users)
      )[0];
      handleItemSelect(u ? u.id : null);
    }
  }, [users, clientId, limitClientId, selectedItem]);

  useEffect(() => {
    if (!isLoading && mode === UserActionsModes.Manage) {
      ensureSelectedItem(selectedUserId);
    }
  }, [isLoading, mode, selectedUserId]);

  const handleSettingsToggle = useCallback((id, event) => {
    // @TODO Open, implement settings
    event.stopPropagation();
  });

  const handleItemDelete = useCallback((id, event) => {
    const stopLoading = () => setIsDeleteBusy(prev => ({ ...prev, [id]: false }));
    event.stopPropagation();
    setIsDeleteBusy(prev => ({ ...prev, [id]: true }));
    dispatch(deleteUser(id, clientId)).then(() => {
      if (id === selectedUserId) {
        ensureSelectedItem(true);
      }
      stopLoading();
    }, stopLoading);
  }, [clientId, selectedUserId]);

  const { form, handleSubmit, pristine, submitting } = useForm({
    initialValues: { add_user_email: '' },
    validate: (values) => {
      let err;
      if (!values.add_user_email) {
        err = 'Field value is required.';
      } else if (!/^\w+([\+\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(values.add_user_email)) {
        err = 'Field value must be a valid email format.';
      }
      return err ? { add_user_email: err } : {};
    },
    onSubmit: (values) => {
      setIsBusy(true);
      const result = {
        email: values.add_user_email,
        client_id: clientId || limitClientId || null,
        company_name: null,
        contact_name: null,
        contact_title: null,
        contact_phone: null,
        contact_fax: null,
        contact_email: null,
        mailing_address_1: null,
        mailing_address_2: null,
        mailing_city: null,
        mailing_state: null,
        mailing_zip: null,
      };
      if (projectId) {
        result.project_id = projectId;
      } else if (reportId) {
        result.report_id = reportId;
      }
      const contextId = clientId ? clientId : (limitClientId ? limitClientId : null);
      dispatch(createUser(result, contextId, mode === UserActionsModes.Manage)).then((action) => {
        const user = action.payload;
        const handleSuccess = () => {
          form.reset();
          setIsBusy(false);
          setIsAddUserOpen(false);
        };
        let promises = [];
        // if (contextId) {
        //   promises.push(
        //     dispatch(authorizeUser(user.id, contextId, { clientId: contextId }, { authorize: true }))
        //       .then(() => {}, () => {})
        //   );
        // }
        Promise.all(promises).then(() => {
          promises = contextId ? [
            dispatch(getUsers(contextId, true)).then(() => {}, () => {}),
            // @TODO Revise; Update permissions (state)
            dispatch(getUserAuthorizations(user.id)).then(() => {}, () => {}),
          ] : [];
          if (mode === UserActionsModes.Grant) {
            promises.push(
              dispatch(getAuthorizedUsers(clientId, authorizedOptions)).then(() => {}, () => {})
            );
          }
          Promise.all(promises).then(() => {
            handleSuccess();
          }, () => {
            setIsBusy(false);
          });
        });
      }, () => {
        setIsBusy(false);
      });
    },
  });

  const addUserField = useField('add_user_email', form);

  const getItemStatus = useCallback((parentId, itemId) => {
    const currentState = activeStates[`${parentId}-${itemId}`];
    if (currentState === true || currentState === false) {
      return currentState;
    }
    const resId = reportId || projectId || clientId;
    const _users = authorizedUsers[`${context}-${resId}@${parentId}`];
    if (_users) {
      for (let i = 0; i < _users.length; i++) {
        const user = _users[i];
        if (user.id === itemId && user.authorized) {
          return true;
        }
      }
    }
    return false;
  }, [clientId, projectId, reportId, authorizedUsers, activeStates]);

  const setItemStatus = useCallback((parentId, itemId, status) => {
    dispatch(authorizeUser(itemId, parentId, authorizedOptions, { authorize: status }))
      .then(() => {}, () => {});
    setActiveStates(prev => ({ ...prev, [`${parentId}-${itemId}`]: status }));
  }, [clientId, projectId, reportId, authorizedOptions]);

  const handleSearch = useCallback((value) => {
    if (!!value.length) {
      if (userNameFilter === null) {
        setOpenClientsBackup({ ...openClients });
      }
      setUserNameFilter(value);
    } else {
      if (openClientsBackup) {
        setOpenClients({ ...openClientsBackup });
        setOpenClientsBackup(null);
        setBlockedClients([]);
        setBlockedUsers([]);
      }
      setUserNameFilter(null);
    }
  }, [userNameFilter, openClients, openClientsBackup]);

  useEffect(() => {
    if (userNameFilter) {
      let filter = userNameFilter.toLowerCase();
      let buids = {}, bcids = {}, cids = {};
      users.forEach(u => {
        if ((u.contact_name || u.email || '').toLowerCase().includes(filter)) {
          u.client_ids.forEach(cid => cids[cid] = true);
        } else {
          buids[u.id] = true;
        }
      });
      clients.forEach(c => !cids[c.id] && (bcids[c.id] = true));
      setBlockedClients(Object.keys(bcids).map(id => +id));
      setBlockedUsers(Object.keys(buids).map(id => +id));
      if (mode === UserActionsModes.Grant) {
        for (let i in cids) {
          handleClientToggle(+i, true);
        }
      }
    }
  }, [userNameFilter, mode]);

  return (
    <div className={`${styles.container} ${props.className || ''}`}>
      <div className={styles.search}>
        <Search placeholder="Search user" onSearch={handleSearch} />
      </div>
      <div className={styles.adders}>
        <button onClick={() => setIsAddUserOpen(true)}>+ Add user</button>
      </div>
      <Modal
        className={styles.modal}
        title="Invite new user"
        open={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
      >
        <div className={styles.modalText}>
          Enter an email address for which to send an invitation.
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            className={styles.modalInput}
            field={addUserField}
            label="Email"
          />
          <div className={styles.modalButtons}>
            <Button type="submit" disabled={isBusy || submitting} loading={isBusy}>
              {!isBusy ? 'Invite new user' : 'Inviting new user'}
            </Button>
            <Button transparent onClick={() => setIsAddUserOpen(false)}>
              <span>Cancel</span>
            </Button>
          </div>
        </form>
      </Modal>
      <Scrollable className={styles.permissions}>
        {!isLoading ? (
          (mode === UserActionsModes.Manage ? (
            <div className={styles.group}>
              <div className={styles.items}>
                {users.filter(u => (
                  (!limitClientId || u.client_ids.indexOf(limitClientId) > -1) &&
                  blockedUsers.indexOf(u.id) === -1
                )).map(user => (
                  <label
                    key={`grant-user-${user.id}`}
                    className={`
                      ${styles.item}
                      ${styles.noIndent}
                      ${selectedItem === user.id ? styles.selectedItem : ''}
                    `}
                    htmlFor={`user-toggle-${user.id}`}
                    title={user.contact_name || user.email}
                    onClick={() => handleItemSelect(user.id)}
                  >
                    <span className={styles.itemName}>
                      {!!(user.contact_name && user.contact_name.length) ? user.contact_name : user.email}
                    </span>
                    {!!isDeleteBusy[user.id] ? (
                      <Loader inline size={3} className={styles.busyLoader} />
                    ) : (
                      <Bin
                        className={styles.itemDelete}
                        onClick={e => handleItemDelete(user.id, e)}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ) : (clients.map(client => (
            allowedClients.indexOf(client.id) > -1 &&
            blockedClients.indexOf(client.id) === -1
          ) && (
            <div className={styles.group} key={`permissions-group-${client.id}`}>
              <div
                className={styles.groupTitle}
                title={client.name}
                onClick={() => handleClientToggle(client.id)}
              >
                <div>
                  <MdPlayArrow className={`${styles.arrow} ${!!openClients[client.id] ? styles.open : ''}`} />
                  <span className={styles.groupName}>{client.name}</span>
                </div>
                <Menu
                  className={styles.groupSettings}
                  onClick={e => handleSettingsToggle(client.id, e)}
                />
              </div>
              {!!openClients[client.id] && (
                !!loadedClients[client.id] ? (
                  <div className={styles.items}>
                    {users.filter(u => (
                      u.client_ids.indexOf(client.id) > -1 &&
                      blockedUsers.indexOf(u.id) === -1
                    )).map(user => (
                      <label
                        key={`grant-user-${user.id}`}
                        className={`
                          ${styles.item}
                          ${selectedItem === user.id ? styles.selectedItem : ''}
                        `}
                        htmlFor={`user-toggle-${client.id}-${user.id}`}
                        title={user.contact_name || user.email}
                        onClick={() => handleItemSelect(user.id)}
                      >
                        <span className={styles.itemName}>
                          {!!(user.contact_name && user.contact_name.length) ? user.contact_name : user.email}
                        </span>
                        <Toggle
                          id={`user-toggle-${client.id}-${user.id}`}
                          className={styles.itemToggle}
                          checked={getItemStatus(client.id, user.id)}
                          onChange={status => setItemStatus(client.id, user.id, status)}
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <Loader inline className={styles.loader} />
                )
              )}
            </div>
          ))))
        ) : (
          <Loader inline className={styles.loader} />
        )}
      </Scrollable>
    </div>
  );
};

export default UserActions;
