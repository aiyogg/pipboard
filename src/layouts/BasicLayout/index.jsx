import React, { Component } from 'react';
import { Nav, Icon, Button, Badge, Dialog, Divider } from '@alifd/next';
import NewPipelineBox from '@/components/NewPipelineBox';
import { redirect } from '@/utils/common';
import './index.scss';

export default class Dashboard extends Component {

  header = (
    <a href="/index.html" style={{ color: '#000' }}>
      <span className="header">PIPCOOK</span>
    </a>
  )

  footer = (
    <div className="footer">
      <span className="footer-left">
        <Button text onClick={() => redirect('/setting')}>
          <Badge>
            <Icon type="set" />
          </Badge>
        </Button>
        <Button text onClick={() => window.open('https://alibaba.github.io/pipcook')}>
          <Badge>
            <Icon type="help" />
          </Badge>
        </Button>
      </span>
      <Divider direction="ver" />
      <Button text className="add-pipeline-btn" onClick={() => this.setState({ newPipelineDialogVisible: true })}>
        <Icon type="add" />New Pipeline
      </Button>
    </div>
  )

  state = {
    newPipelineDialogVisible: false,
    loading: false,
    okDisabled: true,
  }

  select = (selectedKeys) => {
    location.href = `/index.html#/${selectedKeys[0]}`;
  }

  onClosePipelineDialog = async (reason) => {
    console.log('the reason is', reason);
    if (reason === 'ok') {
      this.setState({
        loading: true
      });
      await this.refs.newPipelineBox?.create();
      this.setState({
        loading: false
      });
    }
    this.setState({ newPipelineDialogVisible: false });
  }

  setOkBtnEnable = () => {
    this.setState({
      okDisabled: false
    });
  }

  render() {
    const { loading, okDisabled } = this.state;
    const okProps = { loading, disabled: okDisabled };

    return (
      <div className="dashboard">
        <Dialog
          className="new-pipeline-dialog"
          title="Create a new Pipeline"
          visible={this.state.newPipelineDialogVisible}
          onClose={this.onClosePipelineDialog}
          onCancel={this.onClosePipelineDialog.bind(this, 'cancel')}
          onOk={this.onClosePipelineDialog.bind(this, 'ok')}
          okProps={okProps}>
          <NewPipelineBox ref="newPipelineBox" setOkBtnEnable={this.setOkBtnEnable} />
        </Dialog>
        <Nav className="basic-nav"
          onSelect={this.select}
          direction="hoz"
          hozAlign="left"
          activeDirection="top"
          type="normal"
          header={this.header}
          footer={this.footer}
          selectedKeys={[location.hash.replace(/#\//, '') || 'home']}
          triggerType="hover">
          <Nav.Item key="pipeline">Pipelines</Nav.Item>
          <Nav.Item key="job">Jobs</Nav.Item>
          <Nav.Item key="plugin">Plugins</Nav.Item>
        </Nav>
        {this.props.children}
      </div>
    );
  }
}
