import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './ReportManage.module.css';
import { useHistory } from 'react-router-dom';
import Routes from '../utils/routes';
import PermissionsGranter, { PermissionsGranterModes } from './PermissionsGranter';
import Button from './Button';
import Loader from './Loader';
import { MdInfoOutline, MdSupervisorAccount, MdDelete } from 'react-icons/md';
import { useForm, useField } from 'react-final-form-hooks';
import { Input, Textarea, Datepicker } from './FormFields';
import { getReport, createReport, updateReport, deleteReport } from '../store/reports/actions';
import { format } from 'date-fns';

const ReportManage = props => {
  const { id, projectId } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const editMode = !!id;
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleteBusy, setIsDeleteBusy] = useState(false);
  const data = useSelector(state =>
    editMode ? state.reportsReducer.reports.filter(r => r.id === id)[0] : null);
  const activeProject = useSelector(state => {
    let pid = typeof projectId !== 'undefined' ? projectId : (data ? data.project_id : null);
    return pid !== null ? state.projectsReducer.projects.filter(p => p.id === pid)[0] : null;
  });
  const [clientId, setClientId] = useState(null);
  const client = useSelector(state =>
    clientId !== null ? state.clientsReducer.clients.filter(c => c.id === clientId)[0] : null);

  useEffect(() => {
    if (!!id) {
      dispatch(getReport(id));
    }
  }, [id]);

  useEffect(() => {
    if (activeProject) {
      setClientId(activeProject.domain_id);
    } else {
      setClientId(null);
    }
  }, [activeProject]);

  const { form, handleSubmit, pristine, submitting } = useForm({
    initialValues: data ? {
      name: data.name || '',
      url: data.url || '',
      description: data.description || '',
      presented_on: data.presented_on || '',
      modified_on: data.modified_on || '',
    } : {},
    validate: (values) => {
      let errors = {};
      ['name', 'modified_on'].forEach(key => {
        if (!values[key]) {
          errors[key] = 'Field value is required.'
        }
      });
      return errors;
    },
    onSubmit: (values) => {
      setIsBusy(true);
      const result = {
        name: values.name,
        url: values.url,
        description: values.description,
        presented_on: values.presented_on ?
          format(new Date(values.presented_on), 'yyyy-MM-dd')
          : '',
        modified_on: values.modified_on ?
          format(new Date(values.modified_on), 'yyyy-MM-dd')
          : '',
        project_id: data ? data.project_id : projectId,
      };
      if (editMode) {
        data && dispatch(updateReport(data.id, result)).then(() => {
          form.reset();
          setIsBusy(false);
        });
      } else {
        dispatch(createReport(result)).then(action => {
          setIsBusy(false);
          if (action.payload) {
            history.push(Routes.ManageReport.replace(':id', action.payload.id));
          }
        });
      }
    },
  });

  const name = useField('name', form);
  const url = useField('url', form);
  const description = useField('description', form);
  const presented_on = useField('presented_on', form);
  const modified_on = useField('modified_on', form);

  const handleDelete = () => {
    setIsDeleteBusy(true);
    const parent = data.project_id;
    dispatch(deleteReport(data.id)).then(() => {
      setIsDeleteBusy(false);
      history.push(Routes.ManageProject.replace(':id', parent));
    });
  };

  return !editMode || (editMode && data) ? (
    <div className={styles.container}>
      <div className={styles.actions}>
        <Button transparent onClick={handleDelete} loading={isDeleteBusy}>
          <MdDelete className={styles.deleteIcon} />
          <span>{!isDeleteBusy ? 'Delete report' : 'Deleting report'}</span>
        </Button>
        {editMode && (
          <a className={styles.view} href={data.url} target="_blank">
            <Button>View report</Button>
          </a>
        )}
      </div>
      <div className={`${styles.section} ${styles.left}`}>
        <div className={styles.title}>
          <MdInfoOutline className={styles.icon} />
          <span>Report details</span>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            className={styles.formControl}
            field={name}
            disabled={isBusy}
            label="Report name *"
          />
          <Input
            className={styles.formControl}
            field={url}
            disabled={isBusy}
            label="URL"
          />
          <Textarea
            className={styles.formControl}
            field={description}
            disabled={isBusy}
            label="Description"
          />
          <Datepicker
            className={styles.formControl}
            field={presented_on}
            disabled={isBusy}
            label="Last presented on"
          />
          <Datepicker
            className={styles.formControl}
            field={modified_on}
            disabled={isBusy}
            label="Last modified on *"
          />
          <div className={styles.formButtons}>
            <Button type="submit" disabled={submitting || isBusy} loading={isBusy}>
              {editMode ? (!isBusy ? 'Update' : 'Updating') : (!isBusy ? 'Create' : 'Creating')}
            </Button>
          </div>
        </form>
      </div>
      <div className={`${styles.section} ${styles.right}`}>
        <div className={styles.title}>
          <MdSupervisorAccount className={styles.icon} />
          <span>Report access</span>
        </div>
        <PermissionsGranter
          mode={PermissionsGranterModes.Grant}
          clientId={client ? client.id : null}
          reportId={data ? data.id : null}
        />
      </div>
    </div>
  ) : (
    <Loader inline className={styles.loader} />
  );
};

export default ReportManage;
