import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Chat App',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: LoginPage(),
    );
  }
}

class LoginPage extends StatefulWidget {
  @override
  _LoginPageState createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoginFailed = false;

  void _login() {
    String username = _usernameController.text;
    String password = _passwordController.text;

    // TODO: login API
    if (username == 'user' && password == '1234') {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => ChatScreen()),
      );
    } else {
      setState(() {
        _isLoginFailed = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Container(
          width: 300,  // 로그인 창의 가로 크기를 300으로 설정
          padding: const EdgeInsets.all(16.0),  // 내부 여백 추가
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(0.5),
                spreadRadius: 5,
                blurRadius: 7,
                offset: Offset(0, 3),  // 그림자 위치
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,  // Column의 높이를 내용물 크기에 맞춤
            children: [
              TextField(
                controller: _usernameController,
                decoration: InputDecoration(
                  labelText: 'Username',
                ),
                onSubmitted: (_) => _login(),  // Enter 키로 로그인 시도
              ),
              TextField(
                controller: _passwordController,
                decoration: InputDecoration(
                  labelText: 'Password',
                  errorText: _isLoginFailed ? 'Invalid credentials' : null,
                ),
                obscureText: true,
                onSubmitted: (_) => _login(),  // Enter 키로 로그인 시도
              ),
              SizedBox(height: 20),
              ElevatedButton(
                onPressed: _login,
                child: Text('Login'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  List<String> _messages = [];
  List<List<String>> _savedChats = []; // 히스토리 저장용
  bool _isSidebarOpen = false; // 사이드바 열기/닫기 상태

  @override
  void initState() {
    super.initState();
    // 화면이 열릴 때 TextField에 포커스가 유지되도록 설정
    WidgetsBinding.instance.addPostFrameCallback((_) {
      FocusScope.of(context).requestFocus(_focusNode);
    });

    // 채팅 히스토리 예시 추가
    _savedChats.add([
      'User: Hi there!',
      'Computer: Hello! How can I assist you today?',
    ]);
    _savedChats.add([
      'User: What\'s the weather like?',
      'Computer: It\'s sunny and warm today.',
    ]);
    _savedChats.add([
      'User: Can you help me with my project?',
      'Computer: Sure! What do you need help with?',
    ]);
  }

  void _sendMessage() {
    if (_messageController.text.isEmpty) return;

    setState(() {
      _messages.add('User: ${_messageController.text}');
      _messages.add('Computer: This is a reply.');
      _messageController.clear();
    });

    // 메시지 전송 후 다시 TextField에 포커스를 유지
    FocusScope.of(context).requestFocus(_focusNode);
  }

  void _saveChat() {
    setState(() {
      _savedChats.add(List.from(_messages)); // 현재 메시지 리스트를 저장
    });
  }

  void _loadChatHistory(int index) {
    setState(() {
      _messages = List.from(_savedChats[index]); // 저장된 히스토리 로드
    });
  }

Widget _buildChatBubble(String message, bool isUser) {
  return Align(
    alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
    child: ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: MediaQuery.of(context).size.width * 0.7, // 최대 너비를 화면의 70%로 제한
        minWidth: 0, // 최소 너비는 0 (필요 시 조정 가능)
      ),
      child: Container(
        padding: EdgeInsets.all(8),
        margin: EdgeInsets.symmetric(vertical: 4, horizontal: 16),
        decoration: BoxDecoration(
          color: isUser ? Colors.blue[500] : Colors.grey[300],
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(message),
      ),
    ),
  );
}

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          // 사이드바 영역
          AnimatedContainer(
            duration: Duration(milliseconds: 300),
            width: _isSidebarOpen ? 250 : 0, // 사이드바 너비 조정
            color: Colors.grey[200],
            child: _isSidebarOpen
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,  // 버튼을 사이드바 너비에 맞게 채움
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 32, 16, 16),  // 상단에 충분한 패딩 추가
                        child: ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _messages.clear();
                            });
                          },
                          style: ElevatedButton.styleFrom(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: EdgeInsets.symmetric(vertical: 16),
                            backgroundColor: Colors.green[600],  // 적당한 색상 설정
                          ),
                          child: Center(
                            child: Text(
                              '새로운 채팅',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                      SizedBox(height: 16),  // 새로운 채팅 버튼 아래에 여백 추가
                      // 히스토리 목록을 사이드바 공간에 적절히 채움
                      Expanded(
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),  // 좌우 패딩 추가
                          itemCount: _savedChats.length,
                          itemBuilder: (context, index) {
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8.0),  // 리스트 항목 간격 추가
                              child: ListTile(
                                title: Text('Chat #${index + 1}'),
                                onTap: () {
                                  _loadChatHistory(index); 
                                  setState(() {
                                    _isSidebarOpen = false;  // 히스토리 클릭 후 사이드바 닫기
                                  });
                                },
                              ),
                            );
                          },
                        ),
                      ),
                      SizedBox(height: 16),  // 하단에 여백 추가
                    ],
                  )
                : SizedBox.shrink(),
          ),
          // 채팅 영역
          Expanded(
            child: Column(
              children: [
                // 상단에 사이드바 토글 및 사각형 스타일의 새로운 채팅 버튼을 추가한 Row
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween, // 사이드바 토글 버튼과 새로운 채팅 버튼을 좌우에 배치
                    children: [
                      IconButton(
                        icon: Icon(_isSidebarOpen ? Icons.close : Icons.menu),
                        onPressed: () {
                          setState(() {
                            _isSidebarOpen = !_isSidebarOpen;
                          });
                        },
                      ),
                    ],
                  ),
                ),
                // 채팅 메시지 영역
                Expanded(
                  child: ListView.builder(
                    padding: EdgeInsets.all(16), // 패딩을 주어 여백 확보
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      String message = _messages[index];
                      bool isUser = message.startsWith('User:');
                      return _buildChatBubble(message, isUser);
                    },
                  ),
                ),
                // 입력창과 버튼 영역
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: RawKeyboardListener(
                          focusNode: FocusNode(), // 키보드 이벤트를 감지하기 위한 FocusNode
                          onKey: (RawKeyEvent event) {
                            if (event.isKeyPressed(LogicalKeyboardKey.enter)) {
                              _sendMessage(); // Enter 키를 누르면 메시지 전송
                            }
                          },
                          child: TextField(
                            controller: _messageController,
                            focusNode: _focusNode, // focusNode 연결
                            decoration: InputDecoration(
                              hintText: 'Enter your message',
                              border: OutlineInputBorder(),
                            ),
                            maxLines: null, // 입력창이 줄바꿈되도록 설정
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: _sendMessage,
                        icon: Icon(Icons.send),
                      ),
                      IconButton(
                        onPressed: _saveChat,
                        icon: Icon(Icons.save),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}