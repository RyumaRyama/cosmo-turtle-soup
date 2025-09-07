import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

const WEBSOCKET_URL = 'wss://bc4x5cyj7h.execute-api.ap-northeast-1.amazonaws.com/production'

function App() {
  const [currentScreen, setCurrentScreen] = useState('setup') // 'setup', 'game'
  const [watchword, setWatchword] = useState('')
  const [role, setRole] = useState('') // 'questioner', 'answerer'
  const [ws, setWs] = useState(null)
  const [wsStatus, setWsStatus] = useState('disconnected') // 接続状態を追跡
  const [gameData, setGameData] = useState(null)
  const [questions, setQuestions] = useState([])
  const [newQuestion, setNewQuestion] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const questionIdCounter = useRef(0)

  // WebSocket接続
  useEffect(() => {
    if (currentScreen === 'game' && watchword && role) {
      // モックデータを即座に設定
      const mockData = {
        watchword: watchword,
        question: "男は普通音を立ててすることを音を立てずに行い、周囲を驚かせた。どういうことだろう。",
        answer: "初詣のお賽銭でお札を入れたのだった。"
      }
      setGameData(mockData)

      const websocket = new WebSocket(WEBSOCKET_URL)
      
      websocket.onopen = () => {
        console.log('WebSocket connected successfully')
        setWsStatus('connected')
        // 問題取得（現在はモックデータを使用）
        // websocket.send(JSON.stringify({
        //   action: "get-umigame",
        //   watchword: watchword
        // }))
      }

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('Received WebSocket message:', data)
        
        if (data.question && data.answer) {
          console.log('Setting game data:', data)
          setGameData(data)
        } else if (data.message) {
          // sendmessageで送信されたメッセージを処理
          console.log('Received sendmessage:', data.message)
          try {
            const messageData = JSON.parse(data.message)
            if (messageData.question && messageData.questionId) {
              console.log('Parsed question from message:', messageData)
              const newQuestion = {
                id: messageData.questionId,
                text: messageData.question,
                judgments: [],
                timestamp: new Date(),
                isFromOther: true
              }
              setQuestions(prev => {
                if (prev.some(q => q.id === messageData.questionId)) {
                  console.log('Question already exists, skipping:', messageData.questionId)
                  return prev
                }
                console.log('Adding new question to list:', newQuestion)
                return [...prev, newQuestion]
              })
            }
          } catch (e) {
            console.log('Message is not JSON, treating as plain text:', data.message)
          }
        } else if (data.question && data.questionId) {
          console.log('Received question from other user:', data)
          // 新しい質問を受信（他の参加者からの質問）
          const newQuestion = {
            id: data.questionId,
            text: data.question,
            judgments: [],
            timestamp: new Date(),
            isFromOther: true // 他の参加者からの質問であることを示す
          }
          setQuestions(prev => {
            // 既に同じIDの質問がある場合は追加しない
            if (prev.some(q => q.id === data.questionId)) {
              console.log('Question already exists, skipping:', data.questionId)
              return prev
            }
            console.log('Adding new question to list:', newQuestion)
            return [...prev, newQuestion]
          })
        } else if (data.watchword && data.question_id && data.judgment !== undefined) {
          console.log('Received judgment:', data)
          console.log('Judgment value:', data.judgment, 'Type:', typeof data.judgment)
          
          // 判定結果を受信
          const judgmentValue = data.judgment === 'true' || data.judgment === true
          console.log('Converted judgment to boolean:', judgmentValue)
          
          setQuestions(prev => prev.map(q => 
            q.id === data.question_id 
              ? { 
                  ...q, 
                  judgments: [...q.judgments, judgmentValue] 
                }
              : q
          ))
        } else {
          console.log('Unknown message format:', data)
        }
      }

      websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setWsStatus('disconnected')
      }

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        setWsStatus('error')
      }

      setWs(websocket)

      return () => {
        websocket.close()
      }
    }
  }, [currentScreen, watchword, role])

  const handleSetup = () => {
    if (watchword.trim() && role) {
      setCurrentScreen('game')
    }
  }

  const sendQuestion = () => {
    if (newQuestion.trim() && role === 'answerer' && ws) {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket is not connected. State:', ws.readyState)
        alert('WebSocket接続が確立されていません。再度お試しください。')
        return
      }

      const questionId = `q_${Date.now()}_${questionIdCounter.current++}`
      const newQ = {
        id: questionId,
        text: newQuestion,
        judgments: [],
        timestamp: new Date(),
        isFromSelf: true // 自分が送った質問であることを示す
      }
      
      const message = {
        action: "sendmessage",
        message: JSON.stringify({
          question: newQuestion,
          questionId: questionId
        })
      }
      
      console.log('Sending question via WebSocket:', message)
      
      // WebSocketで質問を送信
      ws.send(JSON.stringify(message))
      
      // 自分のローカル状態にも追加
      setQuestions(prev => [...prev, newQ])
      setNewQuestion('')
      
      console.log('Question sent and added to local state')
    } else {
      if (!newQuestion.trim()) {
        console.log('Empty question, not sending')
      } else if (role !== 'answerer') {
        console.log('User is not answerer, cannot send question')
      } else if (!ws) {
        console.log('WebSocket not initialized')
      }
    }
  }

  const sendJudgment = (questionId, judgment) => {
    if (ws && role === 'questioner') {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket is not connected for judgment. State:', ws.readyState)
        alert('WebSocket接続が確立されていません。再度お試しください。')
        return
      }

      const message = {
        action: "question-judgment",
        watchword: watchword,
        question_id: questionId,
        judgment: judgment
      }
      
      console.log('Sending judgment via WebSocket:', message)
      console.log('Judgment value being sent:', judgment, 'Type:', typeof judgment)
      
      ws.send(JSON.stringify(message))
      
      // 自分の判定も即座に反映
      setQuestions(prev => prev.map(q => 
        q.id === questionId 
          ? { ...q, judgments: [...q.judgments, judgment], hasAnswered: true }
          : q
      ))
      
      console.log('Judgment sent and added to local state')
    } else {
      if (!ws) {
        console.log('WebSocket not initialized for judgment')
      } else if (role !== 'questioner') {
        console.log('User is not questioner, cannot send judgment')
      }
    }
  }

  const getJudgmentStats = (judgments) => {
    console.log('Calculating stats for judgments:', judgments)
    const yesCount = judgments.filter(j => j === true).length
    const noCount = judgments.filter(j => j === false).length
    const total = judgments.length
    
    const stats = {
      yesCount,
      noCount,
      total,
      yesPercent: total > 0 ? Math.round((yesCount / total) * 100) : 0,
      noPercent: total > 0 ? Math.round((noCount / total) * 100) : 0,
      majority: yesCount > noCount ? 'Yes' : noCount > yesCount ? 'No' : 'Tie'
    }
    
    console.log('Calculated stats:', stats)
    return stats
  }

  if (currentScreen === 'setup') {
    return (
      <div className="setup-container">
        <h1>🐢 ウミガメのスープ 🍲</h1>
        <div className="setup-form">
          <div className="input-group">
            <label>合言葉を入力してください：</label>
            <input
              type="text"
              value={watchword}
              onChange={(e) => setWatchword(e.target.value)}
              placeholder="合言葉"
            />
          </div>
          
          <div className="role-selection">
            <label>役割を選択してください：</label>
            <div className="role-buttons">
              <button 
                className={role === 'questioner' ? 'selected' : ''}
                onClick={() => setRole('questioner')}
              >
                出題者
              </button>
              <button 
                className={role === 'answerer' ? 'selected' : ''}
                onClick={() => setRole('answerer')}
              >
                回答者
              </button>
            </div>
          </div>
          
          <button 
            className="start-button"
            onClick={handleSetup}
            disabled={!watchword.trim() || !role}
          >
            ゲーム開始
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <h2>🐢 ウミガメのスープ ({role === 'questioner' ? '出題者' : '回答者'})</h2>
        <div className="connection-status">
          接続状態: <span className={`status-${wsStatus}`}>{
            wsStatus === 'connected' ? '✅ 接続中' : 
            wsStatus === 'disconnected' ? '❌ 切断' : 
            wsStatus === 'error' ? '⚠️ エラー' : '🔄 接続中...'
          }</span>
        </div>
        {gameData && (
          <div className="problem-area">
            {role === 'questioner' ? (
              <div className="answer-display">
                <h3>📝 解答（出題者のみ表示）</h3>
                <p className="answer-text">{gameData.answer}</p>
              </div>
            ) : (
              <div className="question-display">
                <h3>🎯 問題</h3>
                <p className="question-text">{gameData.question}</p>
                {!showAnswer && (
                  <button 
                    className="show-answer-button"
                    onClick={() => setShowAnswer(true)}
                  >
                    答えを見る
                  </button>
                )}
                {showAnswer && (
                  <div className="revealed-answer">
                    <h4>💡 答え</h4>
                    <p>{gameData.answer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="chat-area">
        <h3>💬 質問と回答</h3>
        
        {role === 'answerer' && (
          <div className="question-input">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="質問を入力してください..."
              onKeyPress={(e) => e.key === 'Enter' && sendQuestion()}
            />
            <button onClick={sendQuestion}>質問する</button>
          </div>
        )}

        <div className="questions-list">
          {questions.map((question) => {
            const stats = getJudgmentStats(question.judgments)
            
            return (
              <div key={question.id} className="question-item">
                <div className="question-content">
                  <p className="question-text">
                    ❓ {question.text}
                    {question.isFromSelf && <span className="self-question"> (あなたの質問)</span>}
                    {question.isFromOther && <span className="other-question"> (他の参加者の質問)</span>}
                  </p>
                  <small className="timestamp">
                    {question.timestamp.toLocaleTimeString()}
                  </small>
                </div>
                
                {role === 'questioner' && !question.hasAnswered && (
                  <div className="judgment-buttons">
                    <button 
                      className="yes-button"
                      onClick={() => sendJudgment(question.id, true)}
                    >
                      Yes
                    </button>
                    <button 
                      className="no-button"
                      onClick={() => sendJudgment(question.id, false)}
                    >
                      No
                    </button>
                  </div>
                )}

                {stats.total > 0 && (
                  <div className="judgment-stats">
                    <div className="stats-summary">
                      <span>回答数: {stats.total}</span>
                      <span className="majority">多数派: {stats.majority}</span>
                    </div>
                    
                    <div className="chart-container">
                      <Pie
                        data={{
                          labels: ['Yes', 'No'],
                          datasets: [{
                            data: [stats.yesCount, stats.noCount],
                            backgroundColor: ['#4CAF50', '#f44336'],
                            borderWidth: 1
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom'
                            }
                          }
                        }}
                        height={100}
                      />
                    </div>
                    
                    <div className="percentage-display">
                      <span className="yes-percent">Yes: {stats.yesPercent}%</span>
                      <span className="no-percent">No: {stats.noPercent}%</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default App
