import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Accordion, Table } from 'react-bootstrap';
import axios from 'axios';
import './Channel.css';

function Channel() {
  const [channels, setChannels] = useState([]);
  const [channelName, setChannelName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState([]);
  const [activeKeys, setActiveKeys] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:3001/api/channels')
      .then(response => {
        setChannels(response.data.channels);
      })
      .catch(error => {
        console.error('Error fetching channels:', error);
      });
  }, []);

  const handleApply = () => {
    axios.get('http://localhost:3001/api/data', {
      params: {
        channelName,
        startDate,
        endDate,
      }
    })
      .then(response => {
        const fetchedData = response.data.data;
        setData(fetchedData);
        setActiveKeys(fetchedData.map(item => item.id.toString()));
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  };

  const handleAccordionSelect = (eventKey) => {
    setActiveKeys(eventKey);
  };

  const parseCSVRow = (row) => {
    const cells = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (i + 1 < row.length && row[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };
    
    const headers = parseCSVRow(lines[0]);
    const rows = lines.slice(1).map(line => parseCSVRow(line));
    return { headers, rows };
  };

  const isCSV = (text) => {
    try {
      const { headers, rows } = parseCSV(text);
      return headers.length > 1 && rows.every(row => row.length === headers.length);
    } catch (e) {
      return false;
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col md={3} className="sidebar">
          <h5>Filters</h5>
          <Form>
            <Form.Group className="mb-3" controlId="channelName">
              <Form.Label>Channel Name</Form.Label>
              <Form.Select value={channelName} onChange={(e) => setChannelName(e.target.value)}>
                <option value="">Select a channel</option>
                {channels.map(channel => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="startDate">
              <Form.Label>Start Date</Form.Label>
              <Form.Control type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="endDate">
              <Form.Label>End Date</Form.Label>
              <Form.Control type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Form.Group>
            <Button variant="primary" onClick={handleApply}>Apply</Button>
          </Form>
        </Col>
        <Col md={9} className="main-content">
          <Accordion activeKey={activeKeys} onSelect={handleAccordionSelect} alwaysOpen>
            {data.map(item => (
              <Accordion.Item eventKey={item.id.toString()} key={item.id}>
                <Accordion.Header>{`Channel: ${item.channelName} | Source ID: ${item.id} | Received Time: ${item.received_at}`}</Accordion.Header>
                <Accordion.Body>
                  <Form.Label><h6>Received data</h6></Form.Label>
                  {isCSV(item.source_data) ? (
                    <div className="table-responsive">
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            {parseCSV(item.source_data).headers.map((header, index) => (
                              <th key={index}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parseCSV(item.source_data).rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <Form.Control as="textarea" rows={10} readOnly value={item.source_data} />
                  )}
                  <hr />
                  <Form.Label><h6>Output data</h6></Form.Label>
                  {item.outputs.map(output => (
                    <Form.Control as="textarea" wrap="off" rows={5} cols={1000} readOnly value={output.output_data} key={output.id} />
                  ))}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Col>
      </Row>
    </Container>
  );
}

export default Channel;
