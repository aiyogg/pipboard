import React, { Component } from 'react';
import { Button, Timeline, Select, Divider, Tab, Icon, Affix, Form } from '@alifd/next';
import queryString from 'query-string';
import { PipelineStatus } from '@pipcook/pipcook-core/types/database';

import { getPipcook, redirect, createPluginsFromPipeline } from '@/utils/common';
import { messageSuccess } from '@/utils/message';
import { PLUGINS, pluginList } from '@/utils/config';
import './index.scss';

function formatJSON(str) {
  return JSON.stringify(
    JSON.parse(str),
    null, 2,
  );
}

export default class JobDetailPage extends Component {

  pipcook = getPipcook()

  state = {
    plugins: {},
    choices: pluginList,
    pipelineId: null,
    jobId: null,
    job: {
      stdout: '',
      stderr: '',
      evaluate: {
        pass: null,
        maps: null,
      },
    },
  };

  async componentWillMount() {
    const { jobId, traceId } = queryString.parse(location.hash.split('?')[1]);
    const job = await this.pipcook.job.get(jobId);
    const pipeline = await this.pipcook.pipeline.get(job.pipelineId);

    this.setState({
      plugins: createPluginsFromPipeline(pipeline),
      pipelineId: job.pipelineId,
      jobId,
    });

    // TODO 0 1 5 轮询 2 3 4 结束
    if (traceId && job.status < 2) {
      this.listenJobState(traceId);
    } else {
      this.updateJobState();
    }
  }

  updateJobState = async () => {
    const { jobId } = this.state;
    const job = await this.pipcook.job.get(jobId);
    const logs = await this.pipcook.job.log(jobId);
    if (!logs) {
      return;
    }
    this.setState({
      job: {
        stdout: logs[0],
        stderr: logs[1],
        evaluate: {
          pass: job.evaluatePass,
          maps: formatJSON(job.evaluateMap),
        },
        dataset: formatJSON(job.dataset),
        status: job.status,
      },
    });
  }

  listenJobState = async (id) => {
    try {
      await this.pipcook.job.traceEvent(id, (event, msg) => {
        const newJob = this.state.job;
        if (event === 'log') {
          if (msg.level === 'info') {
            newJob.stdout += `${msg.data}\n`;
          } else if (msg.level === 'error') {
            newJob.stderr += `${msg.data}\n`;
          }
        }
      });
    } catch (err) {
      this.setState((prevState) => {
        const job = prevState.job;
        job.stderr += `${err.stack}\n`;
        return { job };
      });
    }
  }

  changeSelectPlugin = (itemName, value) => {
    const { plugins } = this.state;
    if (!value) {
      delete plugins[itemName];
    } else {
      plugins[itemName] = {
        package: value,
        params: {},
      };
    }
    this.setState({ plugins });
  }

  updateParams = (event, selectType) => {
    const { plugins } = this.state;
    plugins[selectType].params = event.updated_src;
    this.setState({ plugins });
  }

  downloadOutput = () => {
    window.open(this.pipcook.job.getOutputDownloadURL(this.state.jobId))
  }

  restart = async () => {
    // const { jobId } = this.state;
    // await get('/job/restart', {
    //   params: {
    //     jobId, 
    //     cwd: CWD,
    //   },
    // });
    location.reload();
  }

  stop = async () => {
    await get('/job/stop', {
      params: { id: this.state.jobId },
    });
    messageSuccess('job is not running.');
  }

  render() {
    const { job, plugins, choices } = this.state;
    const renderJSONView = (json) => {
      return <pre className="job-logview">{json}</pre>;
    };
    const renderTimelineItem = (title, extra) => {
      const titleNode = <span className="plugin-choose-title">{title}</span>;
      return <Timeline.Item  title={titleNode} {...extra} />;
    };
    const renderLogView = (logs) => {
      return <pre className="job-logview">
        {logs.replace(/\r/g, '\n')}
        {job?.status === 1 && <Icon type="loading" />}
      </pre>;
    };
    const renderSummary = (data) => {
      try {
        const resp = JSON.parse(data?.evaluate?.maps);
        const view = <div style={{ marginTop: 30 }}>
          <Form style={{width: '60%'}} labelCol={{ fixedSpan: 10 }}>
            <Form.Item label="accuracy">
              <p>{resp.accuracy.toPrecision(5)}</p>
            </Form.Item>
            <Form.Item label="loss">
              <p>{resp.loss.toPrecision(5)}</p>
            </Form.Item>
          </Form>
        </div>;
        return view;
      } catch (err) {
        return renderJSONView(data?.evaluate?.maps);
      }
    };

    return (
      <div className="job-info">
        <div className="title-wrapper" >
          <span className="title">job({this.state.jobId})</span>
        </div>
        <div className="content-wrapper">
          <div className="plugin-choose">
            <Affix offsetTop={70}>
              <Timeline className="plugin-choose-timeline">
                {
                  PLUGINS.filter(({ id }) => {
                    return choices[id] && plugins[id];
                  }).map(({ id, title }) => {
                    const name = plugins[id]?.name;
                    const selectNode = <Select className="plugin-choose-selector" value={name} disabled>
                      <Select.Option key={name} value={name}>{name}</Select.Option>
                    </Select>;
                    return renderTimelineItem(title, {
                      key: id,
                      state: 'done',
                      content: selectNode,
                    });
                  })
                }
              </Timeline>
              <Divider />
              <div className="plugin-choose-actions">
                <Button size="medium"
                  type="secondary"
                  onClick={() => {
                    redirect(`/pipeline/info?pipelineId=${this.state.pipelineId}`);
                  }}>View Pipeline</Button>
                <Button size="medium" type="secondary"
                  onClick={this.restart}>Restart</Button>
                <Button size="medium" warning
                  disabled={!job || job.status > PipelineStatus.RUNNING}
                  onClick={this.stop}>Stop</Button>
              </div>
              <Divider />
              <div className="plugin-choose-actions">
                <Button size="medium"
                  disabled={job?.status <= PipelineStatus.RUNNING}
                  onClick={this.downloadOutput}>Download Output</Button>
              </div>
            </Affix>
          </div>
          <div className="job-outputs">
            <Tab className="job-outputs-box">
              <Tab.Item title="stdout">{renderLogView(job?.stdout)}</Tab.Item>
              <Tab.Item title="stderr">{renderLogView(job?.stderr)}</Tab.Item>
                <Tab.Item title="dataset">{renderJSONView(job?.dataset)}</Tab.Item>
              <Tab.Item title="summary">{renderSummary(job)}</Tab.Item>
            </Tab>
          </div>
        </div>
      </div>
    );
  }
}
